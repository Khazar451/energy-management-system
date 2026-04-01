using Microsoft.EntityFrameworkCore;
using EnergyManagement.Models;

namespace EnergyManagement.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Customer> Customers { get; set; }
    public DbSet<Branch> Branches { get; set; }
    public DbSet<Device> Devices { get; set; }
    public DbSet<EnergyManagement.Models.Data> DataRecords { get; set; }
    public DbSet<ProjectConfig> ProjectConfigs { get; set; }
    public DbSet<Provision> Provisions { get; set; }
    public DbSet<MLResult> MLResults { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Customer → Branch (1:N)
        modelBuilder.Entity<Branch>()
            .HasOne(b => b.Customer)
            .WithMany(c => c.Branches)
            .HasForeignKey(b => b.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        // Branch → Device (1:N)
        modelBuilder.Entity<Device>()
            .HasOne(d => d.Branch)
            .WithMany(b => b.Devices)
            .HasForeignKey(d => d.BranchId)
            .OnDelete(DeleteBehavior.Cascade);

        // Device → Data (1:N)
        modelBuilder.Entity<EnergyManagement.Models.Data>()
            .HasOne(d => d.Device)
            .WithMany(dev => dev.DataRecords)
            .HasForeignKey(d => d.DeviceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Branch → ProjectConfig (1:N)
        modelBuilder.Entity<ProjectConfig>()
            .HasOne(p => p.Branch)
            .WithMany(b => b.ProjectConfigs)
            .HasForeignKey(p => p.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        // Branch → Provision (1:N)
        modelBuilder.Entity<Provision>()
            .HasOne(p => p.Branch)
            .WithMany(b => b.Provisions)
            .HasForeignKey(p => p.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        // Branch → MLResult (1:N)
        modelBuilder.Entity<MLResult>()
            .HasOne(p => p.Branch)
            .WithMany()
            .HasForeignKey(p => p.BranchId)
            .OnDelete(DeleteBehavior.Cascade);

        // Column precision
        modelBuilder.Entity<EnergyManagement.Models.Data>()
            .Property(d => d.EnergyUsage)
            .HasColumnType("decimal(18,6)");

        modelBuilder.Entity<Branch>()
            .Property(b => b.SquareMeters)
            .HasColumnType("real");

        modelBuilder.Entity<ProjectConfig>()
            .Property(p => p.ConfidenceLevel)
            .HasColumnType("decimal(5,4)");

        // Indexes
        modelBuilder.Entity<Customer>()
            .HasIndex(c => c.Email)
            .IsUnique();

        modelBuilder.Entity<EnergyManagement.Models.Data>()
            .HasIndex(d => d.Timestamp);
    }
}
