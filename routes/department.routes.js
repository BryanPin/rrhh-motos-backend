const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// GET /api/departments - Obtener todos los departamentos
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, 
              COUNT(e.id) as employee_count
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
       GROUP BY d.id
       ORDER BY d.name`
    );

    res.json({
      count: result.rows.length,
      departments: result.rows
    });

  } catch (error) {
    console.error('Error al obtener departamentos:', error);
    res.status(500).json({ error: 'Error al obtener departamentos' });
  }
});

// GET /api/departments/:id - Obtener departamento por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT d.*, 
              COUNT(e.id) as employee_count
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
       WHERE d.id = $1
       GROUP BY d.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Departamento no encontrado' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error al obtener departamento:', error);
    res.status(500).json({ error: 'Error al obtener departamento' });
  }
});

// POST /api/departments - Crear departamento (admin)
router.post('/', verifyToken, isAdmin, [
  body('name').notEmpty().withMessage('Nombre requerido'),
  body('description').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    const result = await pool.query(
      'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );

    res.status(201).json({
      message: 'Departamento creado exitosamente',
      department: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Ya existe un departamento con ese nombre' });
    }
    console.error('Error al crear departamento:', error);
    res.status(500).json({ error: 'Error al crear departamento' });
  }
});

// PUT /api/departments/:id - Actualizar departamento (admin)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      `UPDATE departments SET
        name = COALESCE($1, name),
        description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [name, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Departamento no encontrado' });
    }

    res.json({
      message: 'Departamento actualizado exitosamente',
      department: result.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar departamento:', error);
    res.status(500).json({ error: 'Error al actualizar departamento' });
  }
});

// DELETE /api/departments/:id - Eliminar departamento (admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que no tenga empleados asignados
    const employeeCheck = await pool.query(
      'SELECT COUNT(*) as count FROM employees WHERE department_id = $1',
      [id]
    );

    if (parseInt(employeeCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un departamento con empleados asignados' 
      });
    }

    const result = await pool.query(
      'DELETE FROM departments WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Departamento no encontrado' });
    }

    res.json({
      message: 'Departamento eliminado exitosamente',
      department: result.rows[0]
    });

  } catch (error) {
    console.error('Error al eliminar departamento:', error);
    res.status(500).json({ error: 'Error al eliminar departamento' });
  }
});

module.exports = router;