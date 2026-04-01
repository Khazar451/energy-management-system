using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EnergyManagement.Models;

[Table("Branch")]
public class Branch
{
    [Key]
    public int Id { get; set; }

    public int CustomerId { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    public float SquareMeters { get; set; }

    // Navigation
    [ForeignKey(nameof(CustomerId))]
    public Customer? Customer { get; set; }

    public ICollection<Device> Devices { get; set; } = new List<Device>();
    public ICollection<ProjectConfig> ProjectConfigs { get; set; } = new List<ProjectConfig>();
    public ICollection<Provision> Provisions { get; set; } = new List<Provision>();
}
