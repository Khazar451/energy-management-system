using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EnergyManagement.Models;

[Table("Device")]
public class Device
{
    [Key]
    public int Id { get; set; }

    public int BranchId { get; set; }

    [MaxLength(100)]
    public string DeviceType { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ModelName { get; set; }

    public DateTime InstallDate { get; set; }

    public bool IsActive { get; set; } = true;

    [MaxLength(200)]
    public string? SerialNumber { get; set; }

    // Navigation
    [ForeignKey(nameof(BranchId))]
    public Branch? Branch { get; set; }

    public ICollection<Data> DataRecords { get; set; } = new List<Data>();
}
