const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario sigue activo
    const result = await pool.query(
      'SELECT u.*, e.first_name, e.last_name FROM users u JOIN employees e ON u.employee_id = e.id WHERE u.id = $1 AND u.is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    req.user = {
      userId: decoded.userId,
      employeeId: decoded.employeeId,
      role: decoded.role,
      username: decoded.username,
      fullName: `${result.rows[0].first_name} ${result.rows[0].last_name}`
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(500).json({ error: 'Error al verificar token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
  }
  next();
};

const isAdminOrSupervisor = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador o supervisor' });
  }
  next();
};

const isOwner = (req, res, next) => {
  const resourceEmployeeId = parseInt(req.params.employeeId || req.params.id);
  
  if (req.user.role === 'admin' || req.user.employeeId === resourceEmployeeId) {
    return next();
  }
  
  return res.status(403).json({ error: 'Acceso denegado. No tienes permiso para acceder a este recurso' });
};

module.exports = {
  verifyToken,
  isAdmin,
  isAdminOrSupervisor,
  isOwner
};