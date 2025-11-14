const express2 = require('express');
const router2 = express2.Router();
const { body: body2, validationResult: validationResult2 } = require('express-validator');
const pool2 = require('../config/database');
const { verifyToken: verifyToken2, isAdmin: isAdmin2 } = require('../middleware/auth.middleware');

// GET /api/positions - Obtener todos los cargos
router2.get('/', verifyToken2, async (req, res) => {
  try {
    const result = await pool2.query(
      `SELECT p.*, 
              COUNT(e.id) as employee_count
       FROM positions p
       LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'active'
       GROUP BY p.id
       ORDER BY p.name`
    );

    res.json({
      count: result.rows.length,
      positions: result.rows
    });

  } catch (error) {
    console.error('Error al obtener cargos:', error);
    res.status(500).json({ error: 'Error al obtener cargos' });
  }
});

// GET /api/positions/:id - Obtener cargo por ID
router2.get('/:id', verifyToken2, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool2.query(
      `SELECT p.*, 
              COUNT(e.id) as employee_count
       FROM positions p
       LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'active'
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cargo no encontrado' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error al obtener cargo:', error);
    res.status(500).json({ error: 'Error al obtener cargo' });
  }
});

// POST /api/positions - Crear cargo (admin)
router2.post('/', verifyToken2, isAdmin2, [
  body2('name').notEmpty().withMessage('Nombre requerido'),
  body2('baseSalary').isFloat({ min: 0 }).withMessage('Salario base inválido'),
  body2('hasCommission').isBoolean().withMessage('Has commission debe ser booleano'),
  body2('commissionPercentage').optional().isFloat({ min: 0, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult2(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, baseSalary, hasCommission, commissionPercentage, description } = req.body;

    const result = await pool2.query(
      `INSERT INTO positions (name, base_salary, has_commission, commission_percentage, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, baseSalary, hasCommission, commissionPercentage || 0, description]
    );

    res.status(201).json({
      message: 'Cargo creado exitosamente',
      position: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un cargo con ese nombre' });
    }
    console.error('Error al crear cargo:', error);
    res.status(500).json({ error: 'Error al crear cargo' });
  }
});

// PUT /api/positions/:id - Actualizar cargo (admin)
router2.put('/:id', verifyToken2, isAdmin2, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, baseSalary, hasCommission, commissionPercentage, description } = req.body;

    const result = await pool2.query(
      `UPDATE positions SET
        name = COALESCE($1, name),
        base_salary = COALESCE($2, base_salary),
        has_commission = COALESCE($3, has_commission),
        commission_percentage = COALESCE($4, commission_percentage),
        description = COALESCE($5, description)
       WHERE id = $6
       RETURNING *`,
      [name, baseSalary, hasCommission, commissionPercentage, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cargo no encontrado' });
    }

    res.json({
      message: 'Cargo actualizado exitosamente',
      position: result.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar cargo:', error);
    res.status(500).json({ error: 'Error al actualizar cargo' });
  }
});

// DELETE /api/positions/:id - Eliminar cargo (admin)
router2.delete('/:id', verifyToken2, isAdmin2, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que no tenga empleados asignados
    const employeeCheck = await pool2.query(
      'SELECT COUNT(*) as count FROM employees WHERE position_id = $1',
      [id]
    );

    if (parseInt(employeeCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un cargo con empleados asignados' 
      });
    }

    const result = await pool2.query(
      'DELETE FROM positions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cargo no encontrado' });
    }

    res.json({
      message: 'Cargo eliminado exitosamente',
      position: result.rows[0]
    });

  } catch (error) {
    console.error('Error al eliminar cargo:', error);
    res.status(500).json({ error: 'Error al eliminar cargo' });
  }
});

module.exports = router2;