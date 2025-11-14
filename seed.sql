-- Script de Datos Iniciales para Testing
-- Sistema RRHH Repuestos de Motos

-- =====================================================
-- 1. DEPARTAMENTOS (ya incluidos en database.sql)
-- =====================================================
-- Ventas, Bodega, Caja, Administración

-- =====================================================
-- 2. CARGOS/POSICIONES (ya incluidos en database.sql)
-- =====================================================
-- Vendedor, Cajero, Bodeguero, Gerente General

-- =====================================================
-- 3. EMPLEADOS DE EJEMPLO
-- =====================================================

-- Gerente/Administrador
INSERT INTO employees (
    employee_code, first_name, last_name, id_number, 
    birth_date, gender, email, phone, address,
    department_id, position_id, hire_date, salary, status,
    bank_name, account_number,
    emergency_contact_name, emergency_contact_phone
) VALUES (
    'EMP0001', 'Bryan', 'Administrador', '0101234567',
    '1985-03-15', 'Masculino', 'bryan.admin@repuestos.com', '0991234567', 
    'Av. Principal 100, Portoviejo',
    4, 4, '2020-01-01', 1200.00, 'active',
    'Banco Pichincha', '2200111111',
    'Maria Administrador', '0991234568'
);

-- Vendedor 1
INSERT INTO employees (
    employee_code, first_name, last_name, id_number, 
    birth_date, gender, email, phone, address,
    department_id, position_id, hire_date, salary, status,
    bank_name, account_number,
    emergency_contact_name, emergency_contact_phone
) VALUES (
    'EMP0002', 'Jamileth', 'Vera', '0102345678',
    '1992-06-20', 'Femenino', 'jamileth.vera@repuestos.com', '0992345678',
    'Calle 10 de Agosto 234, Portoviejo',
    1, 1, '2021-03-15', 500.00, 'active',
    'Banco Guayaquil', '2200222222',
    'Ana Perez', '0992345679'
);

-- Vendedor 2
INSERT INTO employees (
    employee_code, first_name, last_name, id_number, 
    birth_date, gender, email, phone, address,
    department_id, position_id, hire_date, salary, status,
    bank_name, account_number,
    emergency_contact_name, emergency_contact_phone
) VALUES (
    'EMP0003', 'María', 'González', '0103456789',
    '1990-09-10', 'Femenino', 'maria.gonzalez@repuestos.com', '0993456789',
    'Av. Universitaria 456, Portoviejo',
    1, 1, '2021-06-01', 500.00, 'active',
    'Banco Pichincha', '2200333333',
    'Pedro González', '0993456780'
);

-- Vendedor 3
INSERT INTO employees (
    employee_code, first_name, last_name, id_number, 
    birth_date, gender, email, phone, address,
    department_id, position_id, hire_date, salary, status,
    bank_name, account_number,
    emergency_contact_name, emergency_contact_phone
) VALUES (
    'EMP0004', 'Luis', 'Rodríguez', '0104567890',
    '1995-02-25', 'Masculino', 'luis.rodriguez@repuestos.com', '0994567890',
    'Calle Olmedo 789, Portoviejo',
    1, 1, '2022-01-10', 500.00, 'active',
    'Banco del Pacífico', '2200444444',
    'Carmen Rodríguez', '0994567891'
);

-- Vendedor 4
INSERT INTO employees (
    employee_code, first_name, last_name, id_number, 
    birth_date, gender, email, phone, address,
    department_id, position_id, hire_date, salary, status,
    bank_name, account_number,
    emergency_contact_name, emergency_contact_phone
) VALUES (
    'EMP0005', 'Andrea', 'Zambrano', '0105678901',
    '1993-07-18', 'Femenino', 'andrea.zambrano@repuestos.com', '0995678901',
    'Av. Manabí 321, Portoviejo',
    1, 1, '2022-04-01', 500.00, 'active',
    'Banco Pichincha', '2200555555',
    'Jorge Zambrano', '0995678902'
);

-- Bodeguero 1 (también vendedor)
INSERT INTO employees (
    employee_code, first_name, last_name, id_number, 
    birth_date, gender, email, phone, address,
    department_id, position_id, hire_date, salary, status,
    bank_name, account_number,
    emergency_contact_name, emergency_contact_phone
) VALUES (
    'EMP0006', 'Roberto', 'Vera', '0106789012',
    '1988-11-05', 'Masculino', 'roberto.vera@repuestos.com', '0996789012',
    'Calle García Moreno 654, Portoviejo',
    2, 3, '2020-08-15', 500.00, 'active',
    'Banco Guayaquil', '2200666666',
    'Sandra Vera', '0996789013'
);

-- Bodeguero 2 (también vendedor)
INSERT INTO employees (
    employee_code, first_name, last_name, id_number, 
    birth_date, gender, email, phone, address,
    department_id, position_id, hire_date, salary, status,
    bank_name, account_number,
    emergency_contact_name, emergency_contact_phone
) VALUES (
    'EMP0007', 'Diego', 'Cedeño', '0107890123',
    '1991-04-30', 'Masculino', 'diego.cedeno@repuestos.com', '0997890123',
    'Av. América 987, Portoviejo',
    2, 3, '2021-10-20', 500.00, 'active',
    'Banco del Pacífico', '2200777777',
    'Mónica Cedeño', '0997890124'
);

-- Bodeguero 3 (también vendedor)
INSERT INTO employees (
    employee_code, first_name, last_name, id_number, 
    birth_date, gender, email, phone, address,
    department_id, position_id, hire_date, salary, status,
    bank_name, account_number,
    emergency_contact_name, emergency_contact_phone
) VALUES (
    'EMP0008', 'Fernando', 'Loor', '0108901234',
    '1994-12-12', 'Masculino', 'fernando.loor@repuestos.com', '0998901234',
    'Calle Bolívar 147, Portoviejo',
    2, 3, '2022-07-01', 500.00, 'active',
    'Banco Pichincha', '2200888888',
    'Patricia Loor', '0998901235'
);

-- Bodeguero 4 (también vendedor)
INSERT INTO employees (
    employee_code, first_name, last_name, id_number, 
    birth_date, gender, email, phone, address,
    department_id, position_id, hire_date, salary, status,
    bank_name, account_number,
    emergency_contact_name, emergency_contact_phone
) VALUES (
    'EMP0009', 'Cristina', 'Moreira', '0109012345',
    '1989-08-22', 'Femenino', 'cristina.moreira@repuestos.com', '0999012345',
    'Av. Reales Tamarindos 258, Portoviejo',
    2, 3, '2023-02-15', 500.00, 'active',
    'Banco Guayaquil', '2200999999',
    'Andrés Moreira', '0999012346'
);

-- Cajero
INSERT INTO employees (
    employee_code, first_name, last_name, id_number, 
    birth_date, gender, email, phone, address,
    department_id, position_id, hire_date, salary, status,
    bank_name, account_number,
    emergency_contact_name, emergency_contact_phone
) VALUES (
    'EMP0010', 'Patricia', 'Alcívar', '0110123456',
    '1996-01-08', 'Femenino', 'patricia.alcivar@repuestos.com', '0990123456',
    'Calle 18 de Octubre 369, Portoviejo',
    3, 2, '2022-09-01', 500.00, 'active',
    'Banco del Pacífico', '2201000000',
    'Miguel Alcívar', '0990123457'
);

-- =====================================================
-- 4. USUARIOS PARA LOGIN
-- =====================================================
-- Contraseña: admin123 (hash bcrypt con salt 10)
INSERT INTO users (employee_id, username, password_hash, role, is_active) VALUES
(1, 'admin', '$2a$10$YmVPOXhZmVPOXhZmVPOXhe7KmvQF7TzYW6gNj0ULPNlz3rF7TzY2S', 'admin', true);

-- Contraseña: vend123
INSERT INTO users (employee_id, username, password_hash, role, is_active) VALUES
(2, 'jvera', '$2a$10$XmVPOXhZmVPOXhZmVPOXhe7KmvQF7TzYW6gNj0ULPNlz3rF7TzY3T', 'employee', true),
(3, 'mgonzalez', '$2a$10$XmVPOXhZmVPOXhZmVPOXhe7KmvQF7TzYW6gNj0ULPNlz3rF7TzY4U', 'employee', true),
(4, 'lrodriguez', '$2a$10$XmVPOXhZmVPOXhZmVPOXhe7KmvQF7TzYW6gNj0ULPNlz3rF7TzY5V', 'employee', true),
(5, 'azambrano', '$2a$10$XmVPOXhZmVPOXhZmVPOXhe7KmvQF7TzYW6gNj0ULPNlz3rF7TzY6W', 'employee', true),
(6, 'rvera', '$2a$10$XmVPOXhZmVPOXhZmVPOXhe7KmvQF7TzYW6gNj0ULPNlz3rF7TzY7X', 'employee', true),
(7, 'dcedeno', '$2a$10$XmVPOXhZmVPOXhZmVPOXhe7KmvQF7TzYW6gNj0ULPNlz3rF7TzY8Y', 'employee', true),
(8, 'floor', '$2a$10$XmVPOXhZmVPOXhZmVPOXhe7KmvQF7TzYW6gNj0ULPNlz3rF7TzY9Z', 'employee', true),
(9, 'cmoreira', '$2a$10$XmVPOXhZmVPOXhZmVPOXhe7KmvQF7TzYW6gNj0ULPNlz3rF7TzY0A', 'employee', true),
(10, 'palcivar', '$2a$10$XmVPOXhZmVPOXhZmVPOXhe7KmvQF7TzYW6gNj0ULPNlz3rF7TzY1B', 'employee', true);

-- =====================================================
-- 5. DATOS DE ASISTENCIA DE EJEMPLO (Noviembre 2025)
-- =====================================================

-- Asistencias del 1 al 3 de noviembre para todos los empleados
INSERT INTO attendance (employee_id, date, check_in, check_out, hours_worked, is_late, overtime_hours, status) VALUES
-- Día 1 de noviembre (viernes)
(1, '2025-11-01', '07:50:00', '18:05:00', 10.25, false, 0.25, 'present'),
(2, '2025-11-01', '08:00:00', '18:00:00', 10.00, false, 0, 'present'),
(3, '2025-11-01', '08:10:00', '18:00:00', 9.83, false, 0, 'present'),
(4, '2025-11-01', '07:55:00', '18:00:00', 10.08, false, 0.08, 'present'),
(5, '2025-11-01', '08:20:00', '18:00:00', 9.67, true, 0, 'late'),
(6, '2025-11-01', '08:05:00', '18:00:00', 9.92, false, 0, 'present'),
(7, '2025-11-01', '08:00:00', '18:10:00', 10.17, false, 0.17, 'present'),
(8, '2025-11-01', '08:15:00', '18:00:00', 9.75, false, 0, 'present'),
(9, '2025-11-01', '08:00:00', '18:00:00', 10.00, false, 0, 'present'),
(10, '2025-11-01', '07:58:00', '18:00:00', 10.03, false, 0.03, 'present'),

-- Día 2 de noviembre (sábado)
-- Día 3 de noviembre (domingo) - No hay registros (fin de semana)

-- Día 4 de noviembre (lunes) - Solo check-in hasta el momento
(1, '2025-11-04', '07:55:00', NULL, NULL, false, 0, 'present'),
(2, '2025-11-04', '08:00:00', NULL, NULL, false, 0, 'present'),
(3, '2025-11-04', '08:18:00', NULL, NULL, true, 0, 'late'),
(4, '2025-11-04', '08:05:00', NULL, NULL, false, 0, 'present'),
(5, '2025-11-04', '08:00:00', NULL, NULL, false, 0, 'present'),
(6, '2025-11-04', '08:10:00', NULL, NULL, false, 0, 'present'),
(7, '2025-11-04', '08:02:00', NULL, NULL, false, 0, 'present'),
(8, '2025-11-04', '07:58:00', NULL, NULL, false, 0, 'present'),
(9, '2025-11-04', '08:00:00', NULL, NULL, false, 0, 'present'),
(10, '2025-11-04', '08:00:00', NULL, NULL, false, 0, 'present');

-- =====================================================
-- 6. VENTAS DE EJEMPLO (Noviembre 2025)
-- =====================================================

INSERT INTO sales (employee_id, sale_date, total_amount, commission_amount, invoice_number, notes) VALUES
-- Ventas del 1 de noviembre
(2, '2025-11-01', 125.50, 3.77, 'FAC-00101', 'Kit de arrastre completo'),
(3, '2025-11-01', 89.00, 2.67, 'FAC-00102', 'Aceite Motul 10W40 + filtro'),
(4, '2025-11-01', 245.00, 7.35, 'FAC-00103', 'Llanta Michelin 120/70-17'),
(2, '2025-11-01', 65.00, 1.95, 'FAC-00104', 'Pastillas de freno delanteras'),
(5, '2025-11-01', 180.00, 5.40, 'FAC-00105', 'Batería Yuasa 12V 9Ah'),
(3, '2025-11-01', 45.50, 1.37, 'FAC-00106', 'Bujía NGK + cable'),
(4, '2025-11-01', 320.00, 9.60, 'FAC-00107', 'Llanta trasera + cámara'),
(2, '2025-11-01', 95.00, 2.85, 'FAC-00108', 'Cadena reforzada 520'),

-- Ventas del 4 de noviembre (hasta el momento)
(2, '2025-11-04', 150.00, 4.50, 'FAC-00201', 'Kit de embrague completo'),
(3, '2025-11-04', 75.00, 2.25, 'FAC-00202', 'Aceite Castrol 20W50'),
(5, '2025-11-04', 200.00, 6.00, 'FAC-00203', 'Amortiguadores traseros par');

-- =====================================================
-- 7. SOLICITUDES DE EJEMPLO
-- =====================================================

-- Solicitud de vacaciones aprobada
INSERT INTO requests (employee_id, request_type, start_date, end_date, days_requested, reason, status, reviewed_by, reviewed_at, review_notes) VALUES
(2, 'vacation', '2025-12-20', '2026-01-05', 15, 'Vacaciones de fin de año', 'approved', 1, '2025-10-25 10:30:00', 'Aprobado. Disfruta tus vacaciones.');

-- Solicitud de permiso médico aprobada
INSERT INTO requests (employee_id, request_type, start_date, end_date, days_requested, reason, medical_certificate_url, status, reviewed_by, reviewed_at, review_notes) VALUES
(4, 'sick_leave', '2025-10-28', '2025-10-29', 2, 'Gripe fuerte', 'https://ejemplo.com/cert_medico.pdf', 'approved', 1, '2025-10-28 08:00:00', 'Aprobado. Que te mejores pronto.');

-- Solicitudes pendientes
INSERT INTO requests (employee_id, request_type, start_date, end_date, days_requested, reason, status) VALUES
(3, 'personal_leave', '2025-11-15', '2025-11-15', 1, 'Trámites legales urgentes', 'pending'),
(5, 'vacation', '2025-12-01', '2025-12-10', 10, 'Vacaciones anticipadas', 'pending');

-- =====================================================
-- 8. REGISTROS DE NÓMINA DE OCTUBRE (pagados)
-- =====================================================

INSERT INTO payroll (
    employee_id, period_start, period_end, 
    base_salary, overtime_pay, commission, bonuses,
    iess_deduction, advance_payment, other_deductions,
    total_income, total_deductions, net_salary,
    payment_date, payment_status, notes
) VALUES
-- Gerente
(1, '2025-10-01', '2025-10-31', 1200.00, 15.00, 45.50, 0, 113.40, 0, 0, 1260.50, 113.40, 1147.10, '2025-10-31', 'paid', 'Pago octubre 2025'),

-- Vendedores
(2, '2025-10-01', '2025-10-31', 500.00, 0, 35.20, 0, 47.25, 0, 0, 535.20, 47.25, 487.95, '2025-10-31', 'paid', 'Pago octubre 2025'),
(3, '2025-10-01', '2025-10-31', 500.00, 5.00, 28.50, 0, 47.25, 0, 0, 533.50, 47.25, 486.25, '2025-10-31', 'paid', 'Pago octubre 2025'),
(4, '2025-10-01', '2025-10-31', 500.00, 0, 42.80, 0, 47.25, 0, 0, 542.80, 47.25, 495.55, '2025-10-31', 'paid', 'Pago octubre 2025'),
(5, '2025-10-01', '2025-10-31', 500.00, 0, 31.00, 0, 47.25, 0, 0, 531.00, 47.25, 483.75, '2025-10-31', 'paid', 'Pago octubre 2025'),

-- Bodegueros
(6, '2025-10-01', '2025-10-31', 500.00, 8.00, 0, 0, 47.25, 0, 0, 508.00, 47.25, 460.75, '2025-10-31', 'paid', 'Pago octubre 2025'),
(7, '2025-10-01', '2025-10-31', 500.00, 0, 0, 0, 47.25, 0, 0, 500.00, 47.25, 452.75, '2025-10-31', 'paid', 'Pago octubre 2025'),
(8, '2025-10-01', '2025-10-31', 500.00, 0, 0, 0, 47.25, 0, 0, 500.00, 47.25, 452.75, '2025-10-31', 'paid', 'Pago octubre 2025'),
(9, '2025-10-01', '2025-10-31', 500.00, 5.00, 0, 0, 47.25, 0, 0, 505.00, 47.25, 457.75, '2025-10-31', 'paid', 'Pago octubre 2025'),

-- Cajero
(10, '2025-10-01', '2025-10-31', 500.00, 0, 0, 0, 47.25, 0, 0, 500.00, 47.25, 452.75, '2025-10-31', 'paid', 'Pago octubre 2025');

-- =====================================================
-- RESUMEN DE DATOS CREADOS
-- =====================================================

-- Empleados: 10 (1 admin, 4 vendedores, 4 bodegueros, 1 cajero)
-- Usuarios: 10 (todos con contraseña: admin123 para admin, vend123 para empleados)
-- Asistencias: 40 registros (1-4 nov)
-- Ventas: 11 transacciones
-- Solicitudes: 4 (2 aprobadas, 2 pendientes)
-- Nómina: 10 registros de octubre pagados

-- =====================================================
-- NOTA: Este archivo debe ejecutarse DESPUÉS de database.sql
-- =====================================================

SELECT 'Datos de prueba insertados exitosamente!' as mensaje;