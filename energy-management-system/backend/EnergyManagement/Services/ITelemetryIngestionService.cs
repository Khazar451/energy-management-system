using EnergyManagement.DTOs;

namespace EnergyManagement.Services;

/// <summary>
/// Abstract boundary for telemetry ingestion.
/// Currently routes to InfluxDB, but designed for a seamless swap 
/// to Kafka or RabbitMQ when sensor counts increase.
/// </summary>
public interface ITelemetryIngestionService
{
    Task IngestAsync(TelemetryRequest req, int branchId, DateTime timestamp);
}
