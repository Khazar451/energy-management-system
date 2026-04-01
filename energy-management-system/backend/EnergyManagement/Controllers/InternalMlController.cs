using Microsoft.AspNetCore.Mvc;
using EnergyManagement.Data;
using EnergyManagement.Models;

namespace EnergyManagement.Controllers;

[ApiController]
[Route("internal/api/ml")]
// Note: In production, this route should be protected by an internal secret, API key, 
// or network-level isolation since it accepts pushes directly from the Python ML worker.
public class InternalMlController : ControllerBase
{
    private readonly AppDbContext _db;

    public InternalMlController(AppDbContext db)
    {
        _db = db;
    }

    public record MLPushRequest(
        int BranchId, 
        List<MLResultDto> Results
    );

    public record MLResultDto(
        DateTime Timestamp, 
        double ForecastValue, 
        bool IsAnomaly, 
        double AnomalyScore
    );

    /// <summary>
    /// POST /internal/api/ml/results
    /// Receives inference results natively from the Python cron worker.
    /// The ASP.NET API remains the sole service authorized to write to MSSQL.
    /// </summary>
    [HttpPost("results")]
    public async Task<IActionResult> PushResults([FromBody] MLPushRequest req)
    {
        if (req is null || req.Results is null)
            return BadRequest();

        // Optional: you could delete older forecasts for this branch before inserting new ones
        
        var entities = req.Results.Select(r => new MLResult
        {
            BranchId      = req.BranchId,
            Timestamp     = r.Timestamp,
            ForecastValue = r.ForecastValue,
            IsAnomaly     = r.IsAnomaly,
            AnomalyScore  = r.AnomalyScore
        }).ToList();

        _db.MLResults.AddRange(entities);
        await _db.SaveChangesAsync();

        return Ok(new { message = "ML results ingested successfully", count = entities.Count });
    }
}
