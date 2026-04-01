using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EnergyManagement.Data;
using EnergyManagement.DTOs;
using EnergyManagement.Services;

namespace EnergyManagement.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly InfluxDbService _influx;

    public DashboardController(AppDbContext db, InfluxDbService influx)
    {
        _db     = db;
        _influx = influx;
    }

    /// <summary>
    /// GET /api/dashboard/information
    /// Returns energy summary for all branches of the authenticated customer.
    /// </summary>
    [HttpGet("information")]
    [ProducesResponseType(typeof(DashboardInfoDto), 200)]
    public async Task<IActionResult> GetInformation()
    {
        var customerId = GetCustomerId();
        var customer = await _db.Customers
            .AsNoTracking()
            .Include(c => c.Branches)
                .ThenInclude(b => b.Devices)
                    .ThenInclude(d => d.DataRecords)
            .Include(c => c.Branches)
                .ThenInclude(b => b.ProjectConfigs)
            .FirstOrDefaultAsync(c => c.Id == customerId);

        if (customer is null)
            return NotFound();

        var branchSummaries = customer.Branches.Select(b =>
        {
            var totalEnergy = b.Devices
                .SelectMany(d => d.DataRecords)
                .Where(r => r.Timestamp >= DateTime.UtcNow.AddDays(-30))
                .Sum(r => r.EnergyUsage);

            var budgetAlert = b.ProjectConfigs.FirstOrDefault()?.BudgetAlert ?? 0;

            return new BranchSummaryDto(
                b.Id,
                b.City,
                b.Devices.Count(d => d.IsActive),
                Math.Round(totalEnergy, 2),
                budgetAlert
            );
        }).ToList();

        return Ok(new DashboardInfoDto(customer.Id, customer.CompanyName, branchSummaries));
    }

    /// <summary>
    /// GET /api/dashboard/information/{branchId}
    /// Returns detailed time-series energy data for a specific branch (from InfluxDB).
    /// </summary>
    [HttpGet("information/{branchId:int}")]
    public async Task<IActionResult> GetBranchDetail(int branchId, [FromQuery] int days = 7)
    {
        var customerId = GetCustomerId();

        // Verify branch belongs to customer
        var branch = await _db.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == branchId && b.CustomerId == customerId);

        if (branch is null)
            return NotFound(new { message = "Branch not found." });

        var series = await _influx.QueryBranchEnergyAsync(branchId, days);
        var result = series.Select(s => new { time = s.Time, energyKwh = s.Value }).ToList();

        return Ok(new
        {
            branchId,
            city    = branch.City,
            days,
            data    = result
        });
    }

    /// <summary>
    /// GET /api/dashboard/profile
    /// Returns project config and alert settings for all branches.
    /// </summary>
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var customerId = GetCustomerId();

        var configs = await _db.ProjectConfigs
            .AsNoTracking()
            .Where(p => p.Branch!.CustomerId == customerId)
            .Select(p => new
            {
                p.Id,
                p.BranchId,
                city             = p.Branch!.City,
                p.BudgetAlert,
                p.AnalysisPeriod,
                p.PeakTime,
                p.ConfidenceLevel,
                p.PredictionEnabled
            })
            .ToListAsync();

        return Ok(configs);
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    private int GetCustomerId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                 ?? User.FindFirst("sub");
        return int.Parse(claim?.Value ?? "0");
    }

    /// <summary>
    /// GET /api/dashboard/information/{branchId}/analytics
    /// Aggregates ML predictions and anomalies pushed by the Python worker.
    /// </summary>
    [HttpGet("information/{branchId:int}/analytics")]
    public async Task<IActionResult> GetAnalytics(int branchId, [FromQuery] int days = 30)
    {
        var customerId = GetCustomerId();
        var branch = await _db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == branchId && b.CustomerId == customerId);
            
        if (branch is null) return NotFound();

        var since = DateTime.UtcNow.AddDays(-days);
        var results = await _db.MLResults.AsNoTracking()
            .Where(m => m.BranchId == branchId && m.Timestamp >= since)
            .OrderBy(m => m.Timestamp)
            .ToListAsync();

        var anomalies = results.Where(r => r.IsAnomaly).Select(r => new {
            timestamp = r.Timestamp.ToString("O"),
            value     = r.ForecastValue,
            anomaly   = true,
            score     = r.AnomalyScore
        }).ToList();

        var predictions = results.Where(r => !r.IsAnomaly).Select(r => new {
            timestamp    = r.Timestamp.ToString("O"),
            forecast_kwh = r.ForecastValue,
            lower        = r.ForecastValue * 0.9,
            upper        = r.ForecastValue * 1.1,
            method       = "IsolationForest/ARIMA"
        }).ToList();

        return Ok(new 
        {
            branch_id     = branchId,
            total_points  = results.Count,
            anomaly_count = anomalies.Count,
            anomaly_rate  = results.Count > 0 ? (double)anomalies.Count / results.Count : 0,
            anomalies     = anomalies,
            detail        = anomalies,
            predictions   = predictions
        });
    }
}
