using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EnergyManagement.Models;

[Table("Data")]
public class Data
{
    [Key]
    public int Id { get; set; }

    public int DeviceId { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public double EnergyUsage { get; set; }  // kWh

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    // Navigation
    [ForeignKey(nameof(DeviceId))]
    public Device? Device { get; set; }
}
