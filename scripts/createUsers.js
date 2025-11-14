// Script para crear usuarios con contraseñas hasheadas correctamente


require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
 user: process.env.DB_USER || 'postgres',
 host: process.env.DB_HOST || 'localhost', 
 database: process.env.DB_NAME || 'rrhh_motos',
 password: process.env.DB_PASSWORD,
 port: process.env.DB_PORT || 5432,
});

const users = [
  { employeeId: 1, username: 'admin', password: 'admin123', role: 'admin' },
  { employeeId: 2, username: 'jvera', password: 'vend123', role: 'employee' },
  { employeeId: 3, username: 'mgonzalez', password: 'vend123', role: 'employee' },
  { employeeId: 4, username: 'lrodriguez', password: 'vend123', role: 'employee' },
  { employeeId: 5, username: 'azambrano', password: 'vend123', role: 'employee' },
  { employeeId: 6, username: 'rvera', password: 'vend123', role: 'employee' },
  { employeeId: 7, username: 'dcedeno', password: 'vend123', role: 'employee' },
  { employeeId: 8, username: 'floor', password: 'vend123', role: 'employee' },
  { employeeId: 9, username: 'cmoreira', password: 'vend123', role: 'employee' },
  { employeeId: 10, username: 'palcivar', password: 'vend123', role: 'employee' },
];

async function createUsers() {
  const client = await pool.connect();
  
  try {
    console.log('   Iniciando creación de usuarios...\n');

    for (const user of users) {
      console.log(`Procesando: ${user.username}...`);
      
      // Verificar si el usuario ya existe
      const checkResult = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [user.username]
      );

      if (checkResult.rows.length > 0) {
        console.log(`     Usuario ${user.username} ya existe. Actualizando contraseña...`);
        
        // Actualizar contraseña
        const passwordHash = await bcrypt.hash(user.password, 10);
        await client.query(
          'UPDATE users SET password_hash = $1 WHERE username = $2',
          [passwordHash, user.username]
        );
        
        console.log(`    Contraseña actualizada para ${user.username}\n`);
      } else {
        // Crear nuevo usuario
        const passwordHash = await bcrypt.hash(user.password, 10);
        await client.query(
          `INSERT INTO users (employee_id, username, password_hash, role, is_active)
           VALUES ($1, $2, $3, $4, true)`,
          [user.employeeId, user.username, passwordHash, user.role]
        );
        
        console.log(`   Usuario ${user.username} creado exitosamente\n`);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Todos los usuarios han sido procesados!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('   CREDENCIALES DE ACCESO:\n');
    console.log('   ADMINISTRADOR:');
    console.log('   Username: admin');
    console.log('   Password: admin123\n');
    
    console.log('EMPLEADOS (todos con la misma contraseña):');
    console.log('   Password: vend123\n');
    console.log('   Usernames disponibles:');
    users.filter(u => u.role === 'employee').forEach(u => {
      console.log(`   - ${u.username}`);
    });
    console.log('\n');

  } catch (error) {
    console.error('Error al crear usuarios:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createUsers();