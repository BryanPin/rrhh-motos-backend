const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken, isAdmin, isOwner } = require('../middleware/auth.middleware');

// GET /api/employees - Obtener todos los empleados
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, department, position, search } = req.query;
    
    let query = `
      SELECT e.*, 
             d.name as department_name, 
             p.name as position_name,
             p.has_commission,
             p.commission_percentage
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions p ON e.position_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND e.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (department) {
      query += ` AND e.department_id = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (position) {
      query += ` AND e.position_id = $${paramCount}`;
      params.push(position);
      paramCount++;
    }

    if (search) {
      query += ` AND (e.first_name ILIKE $${paramCount} OR e.last_name ILIKE $${paramCount} OR e.employee_code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY e.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      count: result.rows.length,
      employees: result.rows
    });

  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// GET /api/employees/:id - Obtener empleado por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT e.*, 
              d.name as department_name, 
              p.name as position_name,
              p.has_commission,
              p.commission_percentage
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN positions p ON e.position_id = p.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error al obtener empleado:', error);
    res.status(500).json({ error: 'Error al obtener empleado' });
  }
});

// POST /api/employees - Crear nuevo empleado (solo admin)
router.post('/', verifyToken, isAdmin, [
  body('firstName').notEmpty().withMessage('Nombre requerido'),
  body('lastName').notEmpty().withMessage('Apellido requerido'),
  body('idNumber').notEmpty().withMessage('Número de cédula requerido'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('departmentId').isInt().withMessage('Departamento inválido'),
  body('positionId').isInt().withMessage('Cargo inválido'),
  body('hireDate').isDate().withMessage('Fecha de contratación inválida'),
  body('salary').isFloat({ min: 0 }).withMessage('Salario inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      firstName, lastName, idNumber, birthDate, gender,
      email, phone, address, departmentId, positionId,
      hireDate, salary, bankName, accountNumber,
      emergencyContactName, emergencyContactPhone
    } = req.body;

    // Generar código de empleado único
    const codeResult = await pool.query(
      'SELECT MAX(CAST(SUBSTRING(employee_code FROM 4) AS INTEGER)) as max_code FROM employees'
    );
    const maxCode = codeResult.rows[0].max_code || 0;
    const employeeCode = `EMP${String(maxCode + 1).padStart(4, '0')}`;

    // Verificar que la cédula no exista
    const idCheck = await pool.query(
      'SELECT id FROM employees WHERE id_number = $1',
      [idNumber]
    );

    if (idCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un empleado con esta cédula' });
    }

    const result = await pool.query(
      `INSERT INTO employees (
        employee_code, first_name, last_name, id_number, birth_date, gender,
        email, phone, address, department_id, position_id, hire_date, salary,
        bank_name, account_number, emergency_contact_name, emergency_contact_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        employeeCode, firstName, lastName, idNumber, birthDate, gender,
        email, phone, address, departmentId, positionId, hireDate, salary,
        bankName, accountNumber, emergencyContactName, emergencyContactPhone
      ]
    );

    res.status(201).json({
      message: 'Empleado creado exitosamente',
      employee: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear empleado:', error);
    res.status(500).json({ error: 'Error al crear empleado' });
  }
});

// PUT /api/employees/:id - Actualizar empleado
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName, lastName, birthDate, gender, email, phone, address,
      departmentId, positionId, salary, status, bankName, accountNumber,
      emergencyContactName, emergencyContactPhone
    } = req.body;

    // Verificar que el empleado existe
    const checkResult = await pool.query('SELECT id FROM employees WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const result = await pool.query(
      `UPDATE employees SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        birth_date = COALESCE($3, birth_date),
        gender = COALESCE($4, gender),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        address = COALESCE($7, address),
        department_id = COALESCE($8, department_id),
        position_id = COALESCE($9, position_id),
        salary = COALESCE($10, salary),
        status = COALESCE($11, status),
        bank_name = COALESCE($12, bank_name),
        account_number = COALESCE($13, account_number),
        emergency_contact_name = COALESCE($14, emergency_contact_name),
        emergency_contact_phone = COALESCE($15, emergency_contact_phone)
      WHERE id = $16
      RETURNING *`,
      [
        firstName, lastName, birthDate, gender, email, phone, address,
        departmentId, positionId, salary, status, bankName, accountNumber,
        emergencyContactName, emergencyContactPhone, id
      ]
    );

    res.json({
      message: 'Empleado actualizado exitosamente',
      employee: result.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
});

// DELETE /api/employees/:id - Eliminar empleado (soft delete)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE employees SET status = 'inactive' WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json({
      message: 'Empleado desactivado exitosamente',
      employee: result.rows[0]
    });

  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});

// GET /api/employees/:id/vacation-balance - Obtener balance de vacaciones
router.get('/:id/vacation-balance', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        vacation_days_total,
        vacation_days_used,
        vacation_days_available,
        hire_date
       FROM employees WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error al obtener balance de vacaciones:', error);
    res.status(500).json({ error: 'Error al obtener balance de vacaciones' });
  }
});

module.exports = router;