namespace EnergyManagement.DTOs;

// ─── Auth ──────────────────────────────────────────────
public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, string Email, string CompanyName, int CustomerId);

// ─── Telemetry ─────────────────────────────────────────
public record TelemetryRequest(
    int DeviceId,
    double EnergyUsage,
    DateTime? Timestamp,
    string? Description
);

// ─── Dashboard ─────────────────────────────────────────
public record BranchSummaryDto(
    int BranchId,
    string? City,
    int DeviceCount,
    double TotalEnergyUsage,
    double BudgetAlert
);

public record DashboardInfoDto(
    int CustomerId,
    string CompanyName,
    List<BranchSummaryDto> Branches
);

// ─── Inventory ─────────────────────────────────────────
public record DeviceDto(
    int Id,
    int BranchId,
    string? City,
    string DeviceType,
    string? ModelName,
    DateTime InstallDate,
    bool IsActive,
    string? SerialNumber
);

public record AddDeviceRequest(
    int BranchId,
    string DeviceType,
    string? ModelName,
    DateTime InstallDate,
    string? SerialNumber
);
