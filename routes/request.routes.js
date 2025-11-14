const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken, isAdminOrSupervisor } = require('../middleware/auth.middleware');

// POST /api/requests - Crear nueva solicitud
router.post('/', verifyToken, [
  body('requestType').isIn(['vacation', 'sick_leave', 'personal_leave', 'bereavement'])
    .withMessage('Tipo de solicitud inválido'),
  body('startDate').isDate().withMessage('Fecha de inicio inválida'),
  body('endDate').isDate().withMessage('Fecha de fin inválida'),
  body('reason').notEmpty().withMessage('Motivo requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { requestType, startDate, endDate, reason, medicalCertificateUrl } = req.body;
    const employeeId = req.user.employeeId;

    // Validar que la fecha de fin sea mayor o igual a la de inicio
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio' });
    }

    // Calcular días solicitados
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const daysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Si es vacación, verificar días disponibles
    if (requestType === 'vacation') {
      const employeeResult = await pool.query(
        'SELECT vacation_days_available FROM employees WHERE id = $1',
        [employeeId]
      );

      if (employeeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Empleado no encontrado' });
      }

      const availableDays = employeeResult.rows[0].vacation_days_available;
      if (daysRequested > availableDays) {
        return res.status(400).json({ 
          error: `No tienes suficientes días de vacaciones. Disponibles: ${availableDays}, Solicitados: ${daysRequested}`
        });
      }
    }

    // Si es permiso médico, requiere certificado
    if (requestType === 'sick_leave' && !medicalCertificateUrl) {
      return res.status(400).json({ error: 'Se requiere certificado médico para permisos por enfermedad' });
    }

    // Verificar que no haya solicitudes conflictivas
    const conflictCheck = await pool.query(
      `SELECT id FROM requests 
       WHERE employee_id = $1 
       AND status IN ('pending', 'approved')
       AND (
         (start_date BETWEEN $2 AND $3) OR
         (end_date BETWEEN $2 AND $3) OR
         ($2 BETWEEN start_date AND end_date)
       )`,
      [employeeId, startDate, endDate]
    );

    if (conflictCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Ya tienes una solicitud para estas fechas' });
    }

    const result = await pool.query(
      `INSERT INTO requests (employee_id, request_type, start_date, end_date, days_requested, reason, medical_certificate_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [employeeId, requestType, startDate, endDate, daysRequested, reason, medicalCertificateUrl]
    );

    res.status(201).json({
      message: 'Solicitud creada exitosamente',
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
});

// GET /api/requests/my-requests - Obtener mis solicitudes
router.get('/my-requests', verifyToken, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const { status, requestType } = req.query;

    let query = `
      SELECT * FROM requests 
      WHERE employee_id = $1
    `;
    const params = [employeeId];
    let paramCount = 2;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (requestType) {
      query += ` AND request_type = $${paramCount}`;
      params.push(requestType);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      count: result.rows.length,
      requests: result.rows
    });

  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// GET /api/requests - Obtener todas las solicitudes (admin/supervisor)
router.get('/', verifyToken, isAdminOrSupervisor, async (req, res) => {
  try {
    const { status, requestType, employeeId } = req.query;

    let query = `
      SELECT r.*, 
             e.first_name, 
             e.last_name, 
             e.employee_code,
             d.name as department,
             u.username as reviewed_by_username
      FROM requests r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON r.reviewed_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (requestType) {
      query += ` AND r.request_type = $${paramCount}`;
      params.push(requestType);
      paramCount++;
    }

    if (employeeId) {
      query += ` AND r.employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      count: result.rows.length,
      requests: result.rows
    });

  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// GET /api/requests/:id - Obtener solicitud por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, 
              e.first_name, 
              e.last_name, 
              e.employee_code,
              e.vacation_days_available,
              u.username as reviewed_by_username
       FROM requests r
       JOIN employees e ON r.employee_id = e.id
       LEFT JOIN users u ON r.reviewed_by = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    res.status(500).json({ error: 'Error al obtener solicitud' });
  }
});

// PUT /api/requests/:id/approve - Aprobar solicitud (admin/supervisor)
router.put('/:id/approve', verifyToken, isAdminOrSupervisor, [
  body('reviewNotes').optional().isString()
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { reviewNotes } = req.body;

    // Obtener información de la solicitud
    const requestResult = await client.query(
      `SELECT r.*, e.vacation_days_available, e.vacation_days_used
       FROM requests r
       JOIN employees e ON r.employee_id = e.id
       WHERE r.id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Solo se pueden aprobar solicitudes pendientes' });
    }

    // Si es vacación, actualizar días usados
    if (request.request_type === 'vacation') {
      const newVacationDaysUsed = request.vacation_days_used + request.days_requested;
      
      await client.query(
        'UPDATE employees SET vacation_days_used = $1 WHERE id = $2',
        [newVacationDaysUsed, request.employee_id]
      );

      // Actualizar estado del empleado a 'vacation' durante las fechas
      const today = new Date().toISOString().split('T')[0];
      const startDate = request.start_date.toISOString().split('T')[0];
      
      if (startDate <= today) {
        await client.query(
          'UPDATE employees SET status = $1 WHERE id = $2',
          ['vacation', request.employee_id]
        );
      }
    }

    // Actualizar solicitud
    const result = await client.query(
      `UPDATE requests SET 
        status = 'approved',
        reviewed_by = $1,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = $2
       WHERE id = $3
       RETURNING *`,
      [req.user.userId, reviewNotes, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Solicitud aprobada exitosamente',
      request: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json({ error: 'Error al aprobar solicitud' });
  } finally {
    client.release();
  }
});

// PUT /api/requests/:id/reject - Rechazar solicitud (admin/supervisor)
router.put('/:id/reject', verifyToken, isAdminOrSupervisor, [
  body('reviewNotes').notEmpty().withMessage('Motivo de rechazo requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reviewNotes } = req.body;

    // Verificar que la solicitud existe y está pendiente
    const checkResult = await pool.query(
      'SELECT status FROM requests WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Solo se pueden rechazar solicitudes pendientes' });
    }

    const result = await pool.query(
      `UPDATE requests SET 
        status = 'rejected',
        reviewed_by = $1,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = $2
       WHERE id = $3
       RETURNING *`,
      [req.user.userId, reviewNotes, id]
    );

    res.json({
      message: 'Solicitud rechazada',
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
});

// DELETE /api/requests/:id - Cancelar solicitud (solo el empleado y si está pendiente)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.employeeId;

    const checkResult = await pool.query(
      'SELECT employee_id, status FROM requests WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const request = checkResult.rows[0];

    // Solo el empleado puede cancelar su propia solicitud
    if (request.employee_id !== employeeId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta solicitud' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Solo se pueden cancelar solicitudes pendientes' });
    }

    const result = await pool.query(
      `UPDATE requests SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [id]
    );

    res.json({
      message: 'Solicitud cancelada exitosamente',
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Error al cancelar solicitud:', error);
    res.status(500).json({ error: 'Error al cancelar solicitud' });
  }
});

// GET /api/requests/pending/count - Contar solicitudes pendientes (admin)
router.get('/pending/count', verifyToken, isAdminOrSupervisor, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as pending_count FROM requests WHERE status = 'pending'`
    );

    res.json({
      pendingCount: parseInt(result.rows[0].pending_count)
    });

  } catch (error) {
    console.error('Error al contar solicitudes:', error);
    res.status(500).json({ error: 'Error al contar solicitudes' });
  }
});

module.exports = router;