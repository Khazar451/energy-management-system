using EnergyManagement.DTOs;

namespace EnergyManagement.Services;

/// <summary>
/// MVP implementation of telemetry ingestion that routes directly to InfluxDB.
/// Implements ITelemetryIngestionService to allow future decoupling via standard message brokers.
/// </summary>
public class InfluxTelemetryService : ITelemetryIngestionService
{
    private readonly InfluxDbService _influx;

    public InfluxTelemetryService(InfluxDbService influx)
    {
        _influx = influx;
    }

    public async Task IngestAsync(TelemetryRequest req, int branchId, DateTime timestamp)
    {
        // Write to InfluxDB (fire-and-forget style; errors logged but not bubbled up)
        try
        {
            await _influx.WriteEnergyAsync(req.DeviceId, branchId, req.EnergyUsage, timestamp);
        }
        catch (Exception ex)
        {
            // Log but don't fail the ingestion flow
            Console.Error.WriteLine($"[InfluxDB] Write failed: {ex.Message}");
        }
    }
}
