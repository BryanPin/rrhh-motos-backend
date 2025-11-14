const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// GET /api/dashboard/admin - Dashboard para administrador
router.get('/admin', verifyToken, isAdmin, async (req, res) => {
  try {
    // Total de empleados activos
    const employeesResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'vacation' THEN 1 END) as on_vacation,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive
       FROM employees`
    );

    // Asistencia de hoy
    const today = new Date().toISOString().split('T')[0];
    const attendanceResult = await pool.query(
      `SELECT 
        COUNT(*) as total_registered,
        COUNT(CASE WHEN check_in IS NOT NULL THEN 1 END) as checked_in,
        COUNT(CASE WHEN check_out IS NOT NULL THEN 1 END) as checked_out,
        COUNT(CASE WHEN is_late = true THEN 1 END) as late_count
       FROM attendance
       WHERE date = $1`,
      [today]
    );

    // Solicitudes pendientes
    const requestsResult = await pool.query(
      `SELECT 
        COUNT(*) as pending_count,
        COUNT(CASE WHEN request_type = 'vacation' THEN 1 END) as vacation_requests,
        COUNT(CASE WHEN request_type = 'sick_leave' THEN 1 END) as sick_leave_requests
       FROM requests
       WHERE status = 'pending'`
    );

    // Ventas del mes actual
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const salesResult = await pool.query(
      `SELECT 
        COUNT(*) as sales_count,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(commission_amount), 0) as total_commissions
       FROM sales
       WHERE EXTRACT(MONTH FROM sale_date) = $1 
       AND EXTRACT(YEAR FROM sale_date) = $2`,
      [currentMonth, currentYear]
    );

    // Nómina del mes actual (pendiente de pago)
    const payrollResult = await pool.query(
      `SELECT 
        COUNT(*) as employees_count,
        COALESCE(SUM(net_salary), 0) as total_payroll
       FROM payroll
       WHERE EXTRACT(MONTH FROM period_start) = $1 
       AND EXTRACT(YEAR FROM period_start) = $2
       AND payment_status = 'pending'`,
      [currentMonth, currentYear]
    );

    // Top 5 vendedores del mes
    const topSellersResult = await pool.query(
      `SELECT 
        e.first_name,
        e.last_name,
        COUNT(s.id) as sales_count,
        COALESCE(SUM(s.total_amount), 0) as total_sales
       FROM employees e
       LEFT JOIN sales s ON e.id = s.employee_id 
         AND EXTRACT(MONTH FROM s.sale_date) = $1 
         AND EXTRACT(YEAR FROM s.sale_date) = $2
       WHERE e.status = 'active'
       GROUP BY e.id, e.first_name, e.last_name
       ORDER BY total_sales DESC
       LIMIT 5`,
      [currentMonth, currentYear]
    );

    // Empleados por departamento
    const departmentStatsResult = await pool.query(
      `SELECT 
        d.name as department,
        COUNT(e.id) as employee_count
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
       GROUP BY d.id, d.name
       ORDER BY employee_count DESC`
    );

    res.json({
      employees: employeesResult.rows[0],
      attendance: {
        ...attendanceResult.rows[0],
        date: today
      },
      requests: requestsResult.rows[0],
      sales: {
        ...salesResult.rows[0],
        month: currentMonth,
        year: currentYear
      },
      payroll: {
        ...payrollResult.rows[0],
        month: currentMonth,
        year: currentYear
      },
      topSellers: topSellersResult.rows,
      departmentStats: departmentStatsResult.rows
    });

  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
});

// GET /api/dashboard/employee - Dashboard para empleado
router.get('/employee', verifyToken, async (req, res) => {
  try {
    const employeeId = req.user.employeeId;

    // Información del empleado
    const employeeResult = await pool.query(
      `SELECT 
        e.*,
        d.name as department_name,
        p.name as position_name,
        p.has_commission,
        p.commission_percentage
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN positions p ON e.position_id = p.id
       WHERE e.id = $1`,
      [employeeId]
    );

    // Asistencia del mes actual
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const attendanceResult = await pool.query(
      `SELECT 
        COUNT(*) as days_worked,
        COUNT(CASE WHEN is_late = true THEN 1 END) as late_days,
        COALESCE(SUM(hours_worked), 0) as total_hours,
        COALESCE(SUM(overtime_hours), 0) as overtime_hours
       FROM attendance
       WHERE employee_id = $1 
       AND EXTRACT(MONTH FROM date) = $2 
       AND EXTRACT(YEAR FROM date) = $3`,
      [employeeId, currentMonth, currentYear]
    );

    // Asistencia de hoy
    const today = new Date().toISOString().split('T')[0];
    const todayAttendanceResult = await pool.query(
      `SELECT * FROM attendance 
       WHERE employee_id = $1 AND date = $2`,
      [employeeId, today]
    );

    const todayAttendance = todayAttendanceResult.rows.length > 0 
      ? todayAttendanceResult.rows[0] 
      : null;

    // Mis solicitudes pendientes
    const requestsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
       FROM requests
       WHERE employee_id = $1`,
      [employeeId]
    );

    // Últimas solicitudes
    const recentRequestsResult = await pool.query(
      `SELECT * FROM requests
       WHERE employee_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [employeeId]
    );

    // Ventas del mes (si aplica)
    let salesData = null;
    if (employeeResult.rows[0].has_commission) {
      const salesResult = await pool.query(
        `SELECT 
          COUNT(*) as sales_count,
          COALESCE(SUM(total_amount), 0) as total_sales,
          COALESCE(SUM(commission_amount), 0) as total_commissions
         FROM sales
         WHERE employee_id = $1 
         AND EXTRACT(MONTH FROM sale_date) = $2 
         AND EXTRACT(YEAR FROM sale_date) = $3`,
        [employeeId, currentMonth, currentYear]
      );
      salesData = salesResult.rows[0];
    }

    // Último pago
    const lastPayrollResult = await pool.query(
      `SELECT * FROM payroll
       WHERE employee_id = $1 AND payment_status = 'paid'
       ORDER BY payment_date DESC
       LIMIT 1`,
      [employeeId]
    );

    res.json({
      employee: employeeResult.rows[0],
      attendance: {
        monthly: attendanceResult.rows[0],
        today: todayAttendance
      },
      requests: {
        stats: requestsResult.rows[0],
        recent: recentRequestsResult.rows
      },
      sales: salesData,
      lastPayroll: lastPayrollResult.rows.length > 0 ? lastPayrollResult.rows[0] : null
    });

  } catch (error) {
    console.error('Error al obtener dashboard del empleado:', error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
});

// GET /api/dashboard/stats/monthly - Estadísticas mensuales (admin)
router.get('/stats/monthly', verifyToken, isAdmin, async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    // Ventas por mes
    const salesByMonthResult = await pool.query(
      `SELECT 
        EXTRACT(MONTH FROM sale_date) as month,
        COUNT(*) as sales_count,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(commission_amount), 0) as total_commissions
       FROM sales
       WHERE EXTRACT(YEAR FROM sale_date) = $1
       GROUP BY EXTRACT(MONTH FROM sale_date)
       ORDER BY month`,
      [targetYear]
    );

    // Nómina por mes
    const payrollByMonthResult = await pool.query(
      `SELECT 
        EXTRACT(MONTH FROM period_start) as month,
        COUNT(DISTINCT employee_id) as employees_count,
        COALESCE(SUM(net_salary), 0) as total_payroll
       FROM payroll
       WHERE EXTRACT(YEAR FROM period_start) = $1
       GROUP BY EXTRACT(MONTH FROM period_start)
       ORDER BY month`,
      [targetYear]
    );

    // Asistencia por mes
    const attendanceByMonthResult = await pool.query(
      `SELECT 
        EXTRACT(MONTH FROM date) as month,
        COUNT(*) as total_records,
        COUNT(CASE WHEN is_late = true THEN 1 END) as late_count,
        COALESCE(SUM(overtime_hours), 0) as total_overtime
       FROM attendance
       WHERE EXTRACT(YEAR FROM date) = $1
       GROUP BY EXTRACT(MONTH FROM date)
       ORDER BY month`,
      [targetYear]
    );

    res.json({
      year: parseInt(targetYear),
      salesByMonth: salesByMonthResult.rows,
      payrollByMonth: payrollByMonthResult.rows,
      attendanceByMonth: attendanceByMonthResult.rows
    });

  } catch (error) {
    console.error('Error al obtener estadísticas mensuales:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /api/dashboard/stats/attendance-summary - Resumen de asistencia (admin)
router.get('/stats/attendance-summary', verifyToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, month, year } = req.query;

    let query = `
      SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        d.name as department,
        COUNT(a.id) as days_registered,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.is_late THEN 1 END) as late_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
        COALESCE(SUM(a.hours_worked), 0) as total_hours,
        COALESCE(SUM(a.overtime_hours), 0) as overtime_hours,
        ROUND(AVG(CASE WHEN a.hours_worked IS NOT NULL THEN a.hours_worked END), 2) as avg_daily_hours
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

    query += ` GROUP BY e.id, e.employee_code, e.first_name, e.last_name, d.name`;
    query += ` ORDER BY e.employee_code`;

    const result = await pool.query(query, params);

    res.json({
      count: result.rows.length,
      summary: result.rows
    });

  } catch (error) {
    console.error('Error al obtener resumen de asistencia:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

module.exports = router;