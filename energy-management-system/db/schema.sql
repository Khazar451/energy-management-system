-- ═══════════════════════════════════════════════════════════════════
-- ENERJİ YÖNETİM VE KARAR DESTEK SİSTEMİ — MSSQL Schema (Refined)
-- ═══════════════════════════════════════════════════════════════════

USE EnergyManagementDb;
GO

-- 1. Customer
CREATE TABLE Customer (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    CompanyName NVARCHAR(200) NOT NULL,
    Email       NVARCHAR(150) NOT NULL UNIQUE,
    PrimaryAd   NVARCHAR(200),
    PasswordHash NVARCHAR(500),
    CreatedAt   DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 2. Branch
CREATE TABLE Branch (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    CustomerId  INT NOT NULL REFERENCES Customer(Id) ON DELETE CASCADE,
    City        NVARCHAR(100),
    SquareMeters REAL NOT NULL DEFAULT 0
);

-- 3. Device
CREATE TABLE Device (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    BranchId     INT NOT NULL REFERENCES Branch(Id) ON DELETE CASCADE,
    DeviceType   NVARCHAR(100) NOT NULL,
    ModelName    NVARCHAR(100),
    InstallDate  DATETIME2 NOT NULL,
    IsActive     BIT NOT NULL DEFAULT 1,
    SerialNumber NVARCHAR(200)
);

-- 4. Data (telemetry)
CREATE TABLE Data (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    DeviceId    INT NOT NULL REFERENCES Device(Id) ON DELETE CASCADE,
    Timestamp   DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    EnergyUsage DECIMAL(18,6) NOT NULL,
    Description NVARCHAR(500),
    IsActive    BIT NOT NULL DEFAULT 1
);
CREATE INDEX IX_Data_Timestamp ON Data(Timestamp);
CREATE INDEX IX_Data_DeviceId  ON Data(DeviceId);

-- 5. ProjectConfig
CREATE TABLE ProjectConfig (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    BranchId          INT NOT NULL REFERENCES Branch(Id),
    BudgetAlert       DECIMAL(18,2) NOT NULL DEFAULT 0,
    AnalysisPeriod    INT NOT NULL DEFAULT 30,         -- days
    PeakTime          NVARCHAR(50),                    -- e.g. "08:00-18:00"
    ConfidenceLevel   DECIMAL(5,4) NOT NULL DEFAULT 0.95,
    PredictionEnabled BIT NOT NULL DEFAULT 1
);

-- 6. Provision
CREATE TABLE Provision (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    BranchId          INT NOT NULL REFERENCES Branch(Id),
    BranchBuildId     NVARCHAR(200),
    TargetRes         NVARCHAR(200),
    ManyBody          BIT NOT NULL DEFAULT 0,
    LastPart          NVARCHAR(200),
    ConformRealEstate BIT NOT NULL DEFAULT 0,
    LastValue         DECIMAL(18,6)
);

-- 7. MLResult (New table for Python Cron Job pushes)
CREATE TABLE MLResult (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    BranchId    INT NOT NULL REFERENCES Branch(Id) ON DELETE CASCADE,
    Timestamp   DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ForecastValue FLOAT NOT NULL,
    IsAnomaly   BIT NOT NULL DEFAULT 0,
    AnomalyScore FLOAT NOT NULL DEFAULT 0
);
CREATE INDEX IX_MLResult_Timestamp ON MLResult(Timestamp);
CREATE INDEX IX_MLResult_BranchId  ON MLResult(BranchId);
