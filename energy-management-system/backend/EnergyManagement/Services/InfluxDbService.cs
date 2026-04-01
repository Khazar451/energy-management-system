using InfluxDB.Client;
using InfluxDB.Client.Api.Domain;
using InfluxDB.Client.Core.Flux.Domain;
using InfluxDB.Client.Writes;

namespace EnergyManagement.Services;

public class InfluxDbService
{
    private readonly InfluxDBClient _client;
    private readonly string _org;
    private readonly string _bucket;

    public InfluxDbService(IConfiguration config)
    {
        var url    = config["InfluxDB:Url"]    ?? "http://localhost:8086";
        var token  = config["InfluxDB:Token"]  ?? "my-super-secret-token";
        _org       = config["InfluxDB:Org"]    ?? "energy-org";
        _bucket    = config["InfluxDB:Bucket"] ?? "energy-bucket";
        _client    = new InfluxDBClient(url, token);
    }

    /// <summary>Write a single energy reading to InfluxDB.</summary>
    public async Task WriteEnergyAsync(int deviceId, int branchId, double energyKwh, DateTime timestamp)
    {
        var writeApi = _client.GetWriteApiAsync();
        var point = PointData.Measurement("energy_usage")
            .Tag("device_id",  deviceId.ToString())
            .Tag("branch_id",  branchId.ToString())
            .Field("energy_kwh", energyKwh)
            .Timestamp(timestamp.ToUniversalTime(), WritePrecision.Ns);

        await writeApi.WritePointAsync(point, _bucket, _org);
    }

    /// <summary>Query energy usage for a branch over the last N days.</summary>
    public async Task<List<(DateTime Time, double Value)>> QueryBranchEnergyAsync(int branchId, int days = 7)
    {
        var queryApi = _client.GetQueryApi();
        var flux = $"""
            from(bucket: "{_bucket}")
              |> range(start: -{days}d)
              |> filter(fn: (r) => r._measurement == "energy_usage")
              |> filter(fn: (r) => r.branch_id == "{branchId}")
              |> filter(fn: (r) => r._field == "energy_kwh")
              |> sort(columns: ["_time"])
            """;

        var tables = await queryApi.QueryAsync(flux, _org);
        var results = new List<(DateTime, double)>();

        foreach (var table in tables)
            foreach (var record in table.Records)
                results.Add((record.GetTime()!.Value.ToDateTimeUtc(), (double)record.GetValue()));

        return results;
    }

    /// <summary>Query latest reading per device for a branch.</summary>
    public async Task<List<(int DeviceId, double LastValue)>> QueryLatestPerDeviceAsync(int branchId)
    {
        var queryApi = _client.GetQueryApi();
        var flux = $"""
            from(bucket: "{_bucket}")
              |> range(start: -24h)
              |> filter(fn: (r) => r._measurement == "energy_usage")
              |> filter(fn: (r) => r.branch_id == "{branchId}")
              |> filter(fn: (r) => r._field == "energy_kwh")
              |> last()
            """;

        var tables = await queryApi.QueryAsync(flux, _org);
        var results = new List<(int, double)>();

        foreach (var table in tables)
            foreach (var record in table.Records)
            {
                if (int.TryParse(record.GetValueByKey("device_id")?.ToString(), out var devId))
                    results.Add((devId, (double)record.GetValue()));
            }

        return results;
    }
}
