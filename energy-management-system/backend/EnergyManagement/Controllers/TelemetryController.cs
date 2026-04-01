using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EnergyManagement.Data;
using EnergyManagement.DTOs;
using EnergyManagement.Models;
using EnergyManagement.Services;

namespace EnergyManagement.Controllers;

[ApiController]
[Route("api/telemetry")]
[Authorize]
public class TelemetryController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITelemetryIngestionService _ingestion;

    public TelemetryController(AppDbContext db, ITelemetryIngestionService ingestion)
    {
        _db         = db;
        _ingestion  = ingestion;
    }

    /// <summary>
    /// POST /api/telemetry/senddata
    /// Accepts energy reading from IoT device; persists to MSSQL and InfluxDB.
    /// </summary>
    [HttpPost("senddata")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SendData([FromBody] TelemetryRequest req)
    {
        var device = await _db.Devices
            .Include(d => d.Branch)
            .FirstOrDefaultAsync(d => d.Id == req.DeviceId && d.IsActive);

        if (device is null)
            return NotFound(new { message = $"Device {req.DeviceId} not found or inactive." });

        var ts = req.Timestamp?.ToUniversalTime() ?? DateTime.UtcNow;

        // Write to MSSQL
        var record = new EnergyManagement.Models.Data
        {
            DeviceId    = req.DeviceId,
            EnergyUsage = req.EnergyUsage,
            Timestamp   = ts,
            Description = req.Description,
            IsActive    = true
        };
        _db.DataRecords.Add(record);
        await _db.SaveChangesAsync();

        // Write to Time-Series Ingestion Sink (e.g., InfluxDB now, Kafka/RabbitMQ later)
        await _ingestion.IngestAsync(req, device.BranchId, ts);

        return Ok(new { message = "Data received.", recordId = record.Id, timestamp = ts });
    }
}
