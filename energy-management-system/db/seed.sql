-- ═══════════════════════════════════════════════════════════════════
-- ENERJİ YÖNETİM — Seed Data
-- ═══════════════════════════════════════════════════════════════════

USE EnergyManagementDb;
GO

-- Customers (passwords are BCrypt hash of "Test1234!")
INSERT INTO Customer (CompanyName, Email, PrimaryAd, PasswordHash) VALUES
('Acme Enerji A.Ş.',  'admin@acme.com',  'Ahmet Yılmaz',  '$2a$11$TlEviLWd9wHxkupfquWVb.lowA1d8GY8FLP44ca5XPyT.jLOykppG'),
('Beta Holding Ltd.', 'admin@beta.com',  'Ayşe Demir',    '$2a$11$TlEviLWd9wHxkupfquWVb.lowA1d8GY8FLP44ca5XPyT.jLOykppG');

-- Branches
INSERT INTO Branch (CustomerId, City, SquareMeters) VALUES
(1, 'İstanbul',  1500),
(1, 'Ankara',     800),
(2, 'İzmir',     2200),
(2, 'Bursa',      950);

-- Devices
INSERT INTO Device (BranchId, DeviceType, ModelName, InstallDate, IsActive, SerialNumber) VALUES
(1, 'Smart Meter',     'EM-3000',   '2024-01-15', 1, 'SN-001-IST'),
(1, 'HVAC Sensor',     'HV-200X',   '2024-02-10', 1, 'SN-002-IST'),
(2, 'Smart Meter',     'EM-3000',   '2024-03-01', 1, 'SN-003-ANK'),
(3, 'Solar Inverter',  'SI-5KW',    '2024-01-20', 1, 'SN-004-IZM'),
(3, 'Smart Meter',     'EM-4000',   '2024-02-25', 1, 'SN-005-IZM'),
(4, 'HVAC Sensor',     'HV-300X',   '2024-03-15', 1, 'SN-006-BUR'),
(4, 'Smart Meter',     'EM-3000',   '2024-04-01', 1, 'SN-007-BUR'),
(2, 'Solar Inverter',  'SI-3KW',    '2024-04-05', 0, 'SN-008-ANK');

-- ProjectConfig
INSERT INTO ProjectConfig (BranchId, BudgetAlert, AnalysisPeriod, PeakTime, ConfidenceLevel, PredictionEnabled) VALUES
(1, 5000.00, 30, '08:00-20:00', 0.95, 1),
(2, 3000.00, 30, '09:00-18:00', 0.90, 1),
(3, 8000.00, 60, '08:00-22:00', 0.95, 1),
(4, 2500.00, 30, '08:00-17:00', 0.90, 0);

-- Sample Data (last 7 days mock readings)
INSERT INTO Data (DeviceId, Timestamp, EnergyUsage, IsActive) VALUES
(1, DATEADD(day, -6, GETUTCDATE()), 45.3,  1),
(1, DATEADD(day, -5, GETUTCDATE()), 48.1,  1),
(1, DATEADD(day, -4, GETUTCDATE()), 52.7,  1),
(1, DATEADD(day, -3, GETUTCDATE()), 39.5,  1),
(1, DATEADD(day, -2, GETUTCDATE()), 61.2,  1),
(1, DATEADD(day, -1, GETUTCDATE()), 55.8,  1),
(1, GETUTCDATE(),                    47.9,  1),
(3, DATEADD(day, -6, GETUTCDATE()), 28.4,  1),
(3, DATEADD(day, -5, GETUTCDATE()), 31.9,  1),
(3, DATEADD(day, -4, GETUTCDATE()), 29.8,  1),
(4, DATEADD(day, -3, GETUTCDATE()), 95.1,  1),
(4, DATEADD(day, -2, GETUTCDATE()), 102.4, 1),
(4, DATEADD(day, -1, GETUTCDATE()), 88.7,  1);
