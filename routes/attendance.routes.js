const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// POST /api/attendance/check-in - Registrar entrada
router.post('/check-in', verifyToken, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const today = new Date().toISOString().split('T')[0];
    const checkInTime = new Date().toTimeString().split(' ')[0];

    // Verificar si ya registró entrada hoy
    const existingCheck = await pool.query(
      'SELECT id, check_in FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (existingCheck.rows.length > 0 && existingCheck.rows[0].check_in) {
      return res.status(400).json({ 
        error: 'Ya has registrado tu entrada hoy',
        checkIn: existingCheck.rows[0].check_in
      });
    }

    // Determinar si llegó tarde (después de 8:15 AM)
    const workStartTime = process.env.WORK_START_TIME || '08:00:00';
    const lateTolerance = parseInt(process.env.LATE_TOLERANCE_MINUTES || '15');
    
    const [startHour, startMin] = workStartTime.split(':').map(Number);
    const [checkHour, checkMin, checkSec] = checkInTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin + lateTolerance;
    const checkMinutes = checkHour * 60 + checkMin;
    
    const isLate = checkMinutes > startMinutes;

    let result;
    if (existingCheck.rows.length > 0) {
      // Actualizar registro existente
      result = await pool.query(
        `UPDATE attendance SET 
          check_in = $1, 
          is_late = $2,
          status = $3
         WHERE id = $4 
         RETURNING *`,
        [checkInTime, isLate, isLate ? 'late' : 'present', existingCheck.rows[0].id]
      );
    } else {
      // Crear nuevo registro
      result = await pool.query(
        `INSERT INTO attendance (employee_id, date, check_in, is_late, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [employeeId, today, checkInTime, isLate, isLate ? 'late' : 'present']
      );
    }

    res.json({
      message: isLate ? 'Entrada registrada - Llegada tarde' : 'Entrada registrada exitosamente',
      attendance: result.rows[0]
    });

  } catch (error) {
    console.error('Error al registrar entrada:', error);
    res.status(500).json({ error: 'Error al registrar entrada' });
  }
});

// POST /api/attendance/check-out - Registrar salida
router.post('/check-out', verifyToken, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const today = new Date().toISOString().split('T')[0];
    const checkOutTime = new Date().toTimeString().split(' ')[0];

    // Buscar registro de hoy
    const existingCheck = await pool.query(
      'SELECT id, check_in FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (existingCheck.rows.length === 0 || !existingCheck.rows[0].check_in) {
      return res.status(400).json({ 
        error: 'Debes registrar tu entrada primero'
      });
    }

    const checkIn = existingCheck.rows[0].check_in;

    // Calcular horas trabajadas
    const [inHour, inMin, inSec] = checkIn.split(':').map(Number);
    const [outHour, outMin, outSec] = checkOutTime.split(':').map(Number);
    
    const inMinutes = inHour * 60 + inMin;
    const outMinutes = outHour * 60 + outMin;
    const workedMinutes = outMinutes - inMinutes;
    const hoursWorked = (workedMinutes / 60).toFixed(2);

    // Calcular horas extras (más de 10 horas: 8am-6pm)
    const regularHours = 10;
    const overtimeHours = Math.max(0, parseFloat(hoursWorked) - regularHours).toFixed(2);

    const result = await pool.query(
      `UPDATE attendance SET 
        check_out = $1, 
        hours_worked = $2,
        overtime_hours = $3
       WHERE id = $4 
       RETURNING *`,
      [checkOutTime, hoursWorked, overtimeHours, existingCheck.rows[0].id]
    );

    res.json({
      message: 'Salida registrada exitosamente',
      attendance: result.rows[0]
    });

  } catch (error) {
    console.error('Error al registrar salida:', error);
    res.status(500).json({ error: 'Error al registrar salida' });
  }
});

// GET /api/attendance/my-attendance - Obtener mi asistencia
router.get('/my-attendance', verifyToken, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const { startDate, endDate, month, year } = req.query;

    let query = `
      SELECT * FROM attendance 
      WHERE employee_id = $1
    `;
    const params = [employeeId];
    let paramCount = 2;

    if (startDate && endDate) {
      query += ` AND date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(startDate, endDate);
      paramCount += 2;
    } else if (month && year) {
      query += ` AND EXTRACT(MONTH FROM date) = $${paramCount} AND EXTRACT(YEAR FROM date) = $${paramCount + 1}`;
      params.push(month, year);
      paramCount += 2;
    }

    query += ' ORDER BY date DESC';

    const result = await pool.query(query, params);

    // Calcular estadísticas
    const stats = {
      totalDays: result.rows.length,
      presentDays: result.rows.filter(r => r.status === 'present').length,
      lateDays: result.rows.filter(r => r.is_late).length,
      absentDays: result.rows.filter(r => r.status === 'absent').length,
      totalHours: result.rows.reduce((sum, r) => sum + (parseFloat(r.hours_worked) || 0), 0).toFixed(2),
      overtimeHours: result.rows.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0).toFixed(2)
    };

    res.json({
      attendance: result.rows,
      stats
    });

  } catch (error) {
    console.error('Error al obtener asistencia:', error);
    res.status(500).json({ error: 'Error al obtener asistencia' });
  }
});

// GET /api/attendance/today - Verificar asistencia de hoy
router.get('/today', verifyToken, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (result.rows.length === 0) {
      return res.json({ 
        hasCheckedIn: false,
        hasCheckedOut: false
      });
    }

    const record = result.rows[0];
    res.json({
      hasCheckedIn: !!record.check_in,
      hasCheckedOut: !!record.check_out,
      attendance: record
    });

  } catch (error) {
    console.error('Error al verificar asistencia:', error);
    res.status(500).json({ error: 'Error al verificar asistencia' });
  }
});

// GET /api/attendance/employee/:employeeId - Obtener asistencia de un empleado (admin)
router.get('/employee/:employeeId', verifyToken, isAdmin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, month, year } = req.query;

    let query = `
      SELECT a.*, e.first_name, e.last_name, e.employee_code
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.employee_id = $1
    `;
    const params = [employeeId];
    let paramCount = 2;

    if (startDate && endDate) {
      query += ` AND a.date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(startDate, endDate);
      paramCount += 2;
    } else if (month && year) {
      query += ` AND EXTRACT(MONTH FROM a.date) = $${paramCount} AND EXTRACT(YEAR FROM a.date) = $${paramCount + 1}`;
      params.push(month, year);
      paramCount += 2;
    }

    query += ' ORDER BY a.date DESC';

    const result = await pool.query(query, params);

    res.json({
      count: result.rows.length,
      attendance: result.rows
    });

  } catch (error) {
    console.error('Error al obtener asistencia:', error);
    res.status(500).json({ error: 'Error al obtener asistencia' });
  }
});

// GET /api/attendance/report - Reporte de asistencia general (admin)
router.get('/report', verifyToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, month, year } = req.query;

    let query = `
      SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        d.name as department,
        COUNT(a.id) as total_days,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.is_late THEN 1 END) as late_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
        COALESCE(SUM(a.hours_worked), 0) as total_hours,
        COALESCE(SUM(a.overtime_hours), 0) as overtime_hours
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'active'
    `;

    const params = [];
    let paramCount = 1;

    if (startDate && endDate) {
      query += ` AND a.date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(startDate, endDate);
      paramCount += 2;
    } else if (month && year) {
      query += ` AND EXTRACT(MONTH FROM a.date) = $${paramCount} AND EXTRACT(YEAR FROM a.date) = $${paramCount + 1}`;
      params.push(month, year);
      paramCount += 2;
    }

    query += ' GROUP BY e.id, e.employee_code, e.first_name, e.last_name, d.name ORDER BY e.employee_code';

    const result = await pool.query(query, params);

    res.json({
      count: result.rows.length,
      report: result.rows
    });

  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

// POST /api/attendance/manual - Registro manual de asistencia (admin)
router.post('/manual', verifyToken, isAdmin, [
  body('employeeId').isInt().withMessage('ID de empleado inválido'),
  body('date').isDate().withMessage('Fecha inválida'),
  body('status').isIn(['present', 'absent', 'late', 'half_day', 'holiday']).withMessage('Estado inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { employeeId, date, checkIn, checkOut, status, notes } = req.body;

    // Calcular horas si hay entrada y salida
    let hoursWorked = null;
    let overtimeHours = 0;
    
    if (checkIn && checkOut) {
      const [inHour, inMin] = checkIn.split(':').map(Number);
      const [outHour, outMin] = checkOut.split(':').map(Number);
      const inMinutes = inHour * 60 + inMin;
      const outMinutes = outHour * 60 + outMin;
      hoursWorked = ((outMinutes - inMinutes) / 60).toFixed(2);
      overtimeHours = Math.max(0, parseFloat(hoursWorked) - 10).toFixed(2);
    }

    const result = await pool.query(
      `INSERT INTO attendance (employee_id, date, check_in, check_out, hours_worked, overtime_hours, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (employee_id, date) 
       DO UPDATE SET 
         check_in = EXCLUDED.check_in,
         check_out = EXCLUDED.check_out,
         hours_worked = EXCLUDED.hours_worked,
         overtime_hours = EXCLUDED.overtime_hours,
         status = EXCLUDED.status,
         notes = EXCLUDED.notes
       RETURNING *`,
      [employeeId, date, checkIn, checkOut, hoursWorked, overtimeHours, status, notes]
    );

    res.status(201).json({
      message: 'Asistencia registrada exitosamente',
      attendance: result.rows[0]
    });

  } catch (error) {
    console.error('Error al registrar asistencia manual:', error);
    res.status(500).json({ error: 'Error al registrar asistencia manual' });
  }
});

module.exports = router;