using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EnergyManagement.Models;

[Table("ProjectConfig")]
public class ProjectConfig
{
    [Key]
    public int Id { get; set; }

    public int BranchId { get; set; }

    public double BudgetAlert { get; set; }

    public int AnalysisPeriod { get; set; }  // days

    [MaxLength(50)]
    public string? PeakTime { get; set; }  // e.g. "08:00-18:00"

    public double ConfidenceLevel { get; set; } = 0.95;

    public bool PredictionEnabled { get; set; } = true;

    // Navigation
    [ForeignKey(nameof(BranchId))]
    public Branch? Branch { get; set; }
}
