using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EnergyManagement.Models;

[Table("Provision")]
public class Provision
{
    [Key]
    public int Id { get; set; }

    public int BranchId { get; set; }

    [MaxLength(200)]
    public string? BranchBuildId { get; set; }

    [MaxLength(200)]
    public string? TargetRes { get; set; }

    public bool ManyBody { get; set; }

    [MaxLength(200)]
    public string? LastPart { get; set; }

    public bool ConformRealEstate { get; set; }

    public double? LastValue { get; set; }

    // Navigation
    [ForeignKey(nameof(BranchId))]
    public Branch? Branch { get; set; }
}
