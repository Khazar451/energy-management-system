using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EnergyManagement.Models;

[Table("MLResult")]
public class MLResult
{
    [Key]
    public int Id { get; set; }

    public int BranchId { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public double ForecastValue { get; set; }

    public bool IsAnomaly { get; set; }

    public double AnomalyScore { get; set; }

    // Navigation
    [ForeignKey(nameof(BranchId))]
    public Branch? Branch { get; set; }
}
