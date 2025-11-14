const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// POST /api/payroll/calculate - Calcular nómina para un período (admin)
router.post('/calculate', verifyToken, isAdmin, [
  body('periodStart').isDate().withMessage('Fecha de inicio inválida'),
  body('periodEnd').isDate().withMessage('Fecha de fin inválida'),
  body('employeeIds').optional().isArray().withMessage('IDs de empleados debe ser un array')
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { periodStart, periodEnd, employeeIds } = req.body;

    // Query base para obtener empleados
    let employeeQuery = `
      SELECT e.*, p.has_commission, p.commission_percentage
      FROM employees e
      JOIN positions p ON e.position_id = p.id
      WHERE e.status = 'active'
    `;

    const params = [];
    if (employeeIds && employeeIds.length > 0) {
      employeeQuery += ` AND e.id = ANY($1)`;
      params.push(employeeIds);
    }

    const employeesResult = await client.query(employeeQuery, params);
    const payrollRecords = [];

    for (const employee of employeesResult.rows) {
      // Calcular salario base proporcional
      const baseSalary = parseFloat(employee.salary);

      // Calcular horas extras
      const overtimeResult = await client.query(
        `SELECT COALESCE(SUM(overtime_hours), 0) as total_overtime
         FROM attendance
         WHERE employee_id = $1 AND date BETWEEN $2 AND $3`,
        [employee.id, periodStart, periodEnd]
      );
      
      const overtimeHours = parseFloat(overtimeResult.rows[0].total_overtime);
      const hourlyRate = baseSalary / 240; // Asumiendo 240 horas mensuales (10h x 24 días)
      const overtimePay = overtimeHours * hourlyRate * 1.5; // 50% adicional por hora extra

      // Calcular comisiones si aplica
      let commission = 0;
      if (employee.has_commission) {
        const salesResult = await client.query(
          `SELECT COALESCE(SUM(total_amount), 0) as total_sales
           FROM sales
           WHERE employee_id = $1 AND sale_date BETWEEN $2 AND $3`,
          [employee.id, periodStart, periodEnd]
        );
        
        const totalSales = parseFloat(salesResult.rows[0].total_sales);
        commission = (totalSales * employee.commission_percentage) / 100;
      }

      // Calcular bonos (podría ser por desempeño, puntualidad, etc.)
      const bonuses = 0; // Por ahora 0, se puede agregar lógica después

      // Calcular deducciones
      const iessDeduction = baseSalary * 0.0945; // 9.45% IESS Ecuador (puede variar)
      
      // Obtener anticipos del período
      const advanceResult = await client.query(
        `SELECT COALESCE(SUM(advance_payment), 0) as total_advance
         FROM payroll
         WHERE employee_id = $1 
         AND payment_status = 'paid'
         AND period_start >= $2 AND period_end <= $3`,
        [employee.id, periodStart, periodEnd]
      );
      
      const advancePayment = parseFloat(advanceResult.rows[0].total_advance || 0);
      const otherDeductions = 0;

      // Calcular totales
      const totalIncome = baseSalary + overtimePay + commission + bonuses;
      const totalDeductions = iessDeduction + advancePayment + otherDeductions;
      const netSalary = totalIncome - totalDeductions;

      // Insertar registro de nómina
      const payrollResult = await client.query(
        `INSERT INTO payroll (
          employee_id, period_start, period_end, base_salary,
          overtime_pay, commission, bonuses,
          iess_deduction, advance_payment, other_deductions,
          total_income, total_deductions, net_salary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          employee.id, periodStart, periodEnd, baseSalary,
          overtimePay, commission, bonuses,
          iessDeduction, advancePayment, otherDeductions,
          totalIncome, totalDeductions, netSalary
        ]
      );

      payrollRecords.push(payrollResult.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Nómina calculada exitosamente',
      count: payrollRecords.length,
      payroll: payrollRecords
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al calcular nómina:', error);
    res.status(500).json({ error: 'Error al calcular nómina' });
  } finally {
    client.release();
  }
});

// GET /api/payroll - Obtener registros de nómina (admin)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { employeeId, periodStart, periodEnd, paymentStatus } = req.query;

    let query = `
      SELECT p.*, 
             e.employee_code,
             e.first_name,
             e.last_name,
             d.name as department,
             pos.name as position
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions pos ON e.position_id = pos.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (employeeId) {
      query += ` AND p.employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }

    if (periodStart) {
      query += ` AND p.period_start >= $${paramCount}`;
      params.push(periodStart);
      paramCount++;
    }

    if (periodEnd) {
      query += ` AND p.period_end <= $${paramCount}`;
      params.push(periodEnd);
      paramCount++;
    }

    if (paymentStatus) {
      query += ` AND p.payment_status = $${paramCount}`;
      params.push(paymentStatus);
      paramCount++;
    }

    query += ' ORDER BY p.period_start DESC, e.employee_code';

    const result = await pool.query(query, params);

    // Calcular totales
    const totals = {
      totalBaseSalary: result.rows.reduce((sum, r) => sum + parseFloat(r.base_salary), 0),
      totalNetSalary: result.rows.reduce((sum, r) => sum + parseFloat(r.net_salary), 0),
      totalCommission: result.rows.reduce((sum, r) => sum + parseFloat(r.commission), 0),
      totalDeductions: result.rows.reduce((sum, r) => sum + parseFloat(r.total_deductions), 0)
    };

    res.json({
      count: result.rows.length,
      payroll: result.rows,
      totals
    });

  } catch (error) {
    console.error('Error al obtener nómina:', error);
    res.status(500).json({ error: 'Error al obtener nómina' });
  }
});

// GET /api/payroll/my-payroll - Obtener mi historial de nómina
router.get('/my-payroll', verifyToken, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const { year, month } = req.query;

    let query = `
      SELECT * FROM payroll
      WHERE employee_id = $1
    `;
    
    const params = [employeeId];
    let paramCount = 2;

    if (year) {
      query += ` AND EXTRACT(YEAR FROM period_start) = $${paramCount}`;
      params.push(year);
      paramCount++;
    }

    if (month) {
      query += ` AND EXTRACT(MONTH FROM period_start) = $${paramCount}`;
      params.push(month);
      paramCount++;
    }

    query += ' ORDER BY period_start DESC';

    const result = await pool.query(query, params);

    res.json({
      count: result.rows.length,
      payroll: result.rows
    });

  } catch (error) {
    console.error('Error al obtener nómina:', error);
    res.status(500).json({ error: 'Error al obtener nómina' });
  }
});

// GET /api/payroll/:id - Obtener registro de nómina por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, 
              e.employee_code,
              e.first_name,
              e.last_name,
              e.id_number,
              e.bank_name,
              e.account_number,
              d.name as department,
              pos.name as position
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN positions pos ON e.position_id = pos.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro de nómina no encontrado' });
    }

    // Verificar permisos: admin o el mismo empleado
    if (req.user.role !== 'admin' && req.user.employeeId !== result.rows[0].employee_id) {
      return res.status(403).json({ error: 'No tienes permiso para ver este registro' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error al obtener registro de nómina:', error);
    res.status(500).json({ error: 'Error al obtener registro de nómina' });
  }
});

// PUT /api/payroll/:id/mark-paid - Marcar nómina como pagada (admin)
router.put('/:id/mark-paid', verifyToken, isAdmin, [
  body('paymentDate').isDate().withMessage('Fecha de pago inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { paymentDate, notes } = req.body;

    const result = await pool.query(
      `UPDATE payroll SET 
        payment_status = 'paid',
        payment_date = $1,
        notes = COALESCE($2, notes)
       WHERE id = $3 AND payment_status = 'pending'
       RETURNING *`,
      [paymentDate, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o ya fue pagado' });
    }

    res.json({
      message: 'Nómina marcada como pagada',
      payroll: result.rows[0]
    });

  } catch (error) {
    console.error('Error al marcar nómina como pagada:', error);
    res.status(500).json({ error: 'Error al marcar nómina como pagada' });
  }
});

// PUT /api/payroll/:id - Actualizar registro de nómina (admin)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      baseSalary, overtimePay, commission, bonuses,
      iessDeduction, advancePayment, otherDeductions, notes
    } = req.body;

    // Recalcular totales
    const totalIncome = (parseFloat(baseSalary) || 0) + 
                        (parseFloat(overtimePay) || 0) + 
                        (parseFloat(commission) || 0) + 
                        (parseFloat(bonuses) || 0);
    
    const totalDeductions = (parseFloat(iessDeduction) || 0) + 
                            (parseFloat(advancePayment) || 0) + 
                            (parseFloat(otherDeductions) || 0);
    
    const netSalary = totalIncome - totalDeductions;

    const result = await pool.query(
      `UPDATE payroll SET
        base_salary = COALESCE($1, base_salary),
        overtime_pay = COALESCE($2, overtime_pay),
        commission = COALESCE($3, commission),
        bonuses = COALESCE($4, bonuses),
        iess_deduction = COALESCE($5, iess_deduction),
        advance_payment = COALESCE($6, advance_payment),
        other_deductions = COALESCE($7, other_deductions),
        total_income = $8,
        total_deductions = $9,
        net_salary = $10,
        notes = COALESCE($11, notes)
       WHERE id = $12
       RETURNING *`,
      [
        baseSalary, overtimePay, commission, bonuses,
        iessDeduction, advancePayment, otherDeductions,
        totalIncome, totalDeductions, netSalary, notes, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro de nómina no encontrado' });
    }

    res.json({
      message: 'Nómina actualizada exitosamente',
      payroll: result.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar nómina:', error);
    res.status(500).json({ error: 'Error al actualizar nómina' });
  }
});

// DELETE /api/payroll/:id - Eliminar registro de nómina (admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Solo se pueden eliminar registros pendientes
    const result = await pool.query(
      `DELETE FROM payroll 
       WHERE id = $1 AND payment_status = 'pending'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o ya fue pagado' });
    }

    res.json({
      message: 'Registro de nómina eliminado exitosamente',
      payroll: result.rows[0]
    });

  } catch (error) {
    console.error('Error al eliminar nómina:', error);
    res.status(500).json({ error: 'Error al eliminar nómina' });
  }
});

// GET /api/payroll/summary/:year/:month - Resumen de nómina por mes (admin)
router.get('/summary/:year/:month', verifyToken, isAdmin, async (req, res) => {
  try {
    const { year, month } = req.params;

    const result = await pool.query(
      `SELECT 
        COUNT(*) as employee_count,
        SUM(base_salary) as total_base_salary,
        SUM(overtime_pay) as total_overtime_pay,
        SUM(commission) as total_commission,
        SUM(bonuses) as total_bonuses,
        SUM(total_income) as total_income,
        SUM(iess_deduction) as total_iess_deduction,
        SUM(total_deductions) as total_deductions,
        SUM(net_salary) as total_net_salary,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count
       FROM payroll
       WHERE EXTRACT(YEAR FROM period_start) = $1
       AND EXTRACT(MONTH FROM period_start) = $2`,
      [year, month]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

module.exports = router;