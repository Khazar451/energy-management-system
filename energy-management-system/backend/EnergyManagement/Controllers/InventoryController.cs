using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EnergyManagement.Data;
using EnergyManagement.DTOs;
using EnergyManagement.Models;

namespace EnergyManagement.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly AppDbContext _db;

    public InventoryController(AppDbContext db) => _db = db;

    /// <summary>
    /// GET /api/inventory/getdevices
    /// Returns all devices for branches belonging to the authenticated customer.
    /// </summary>
    [HttpGet("getdevices")]
    [ProducesResponseType(typeof(List<DeviceDto>), 200)]
    public async Task<IActionResult> GetDevices()
    {
        var customerId = GetCustomerId();

        var devices = await _db.Devices
            .AsNoTracking()
            .Where(d => d.Branch!.CustomerId == customerId)
            .Select(d => new DeviceDto(
                d.Id,
                d.BranchId,
                d.Branch!.City,
                d.DeviceType,
                d.ModelName,
                d.InstallDate,
                d.IsActive,
                d.SerialNumber
            ))
            .ToListAsync();

        return Ok(devices);
    }

    /// <summary>
    /// POST /api/inventory/adddevice
    /// Adds a new IoT device to a branch.
    /// </summary>
    [HttpPost("adddevice")]
    [ProducesResponseType(typeof(DeviceDto), 201)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> AddDevice([FromBody] AddDeviceRequest req)
    {
        var customerId = GetCustomerId();

        var branch = await _db.Branches
            .FirstOrDefaultAsync(b => b.Id == req.BranchId && b.CustomerId == customerId);

        if (branch is null)
            return NotFound(new { message = "Branch not found or access denied." });

        var device = new Device
        {
            BranchId     = req.BranchId,
            DeviceType   = req.DeviceType,
            ModelName    = req.ModelName,
            InstallDate  = req.InstallDate.ToUniversalTime(),
            IsActive     = true,
            SerialNumber = req.SerialNumber
        };

        _db.Devices.Add(device);
        await _db.SaveChangesAsync();

        var dto = new DeviceDto(
            device.Id, device.BranchId, branch.City,
            device.DeviceType, device.ModelName,
            device.InstallDate, device.IsActive, device.SerialNumber
        );

        return CreatedAtAction(nameof(GetDevices), dto);
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    private int GetCustomerId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
                 ?? User.FindFirst("sub");
        return int.Parse(claim?.Value ?? "0");
    }
}
