using Microsoft.AspNetCore.SignalR;
using Octonica.ClickHouseClient;

public class AlertMonitorService : BackgroundService
{
    private readonly IHubContext<AlertsHub> _hubContext;
    private readonly ILogger<AlertMonitorService> _logger;
    private const string connStr = "Host=127.0.0.1;Port=9000;Database=observability;User=default;";
    private DateTime _lastCheck;

    public AlertMonitorService(IHubContext<AlertsHub> hubContext, ILogger<AlertMonitorService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
        _lastCheck = DateTime.UtcNow.AddMinutes(-1);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Alert Monitor Service started");
        
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckForNewAlerts();
                await Task.Delay(1000, stoppingToken); // Check every second
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking for new alerts");
                await Task.Delay(5000, stoppingToken); // Wait longer on error
            }
        }
    }

    private async Task CheckForNewAlerts()
    {
        try
        {
            await using var conn = new ClickHouseConnection(connStr);
            conn.Open();
            
            var sql = @"SELECT id, ts, level, message, payload, source_file, source_offset, ingested_at 
                       FROM observability.alerts 
                       WHERE ingested_at > @lastCheck 
                       ORDER BY ingested_at ASC";

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            cmd.Parameters.AddWithValue("lastCheck", _lastCheck);

            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                var alert = new
                {
                    id = reader.GetValue(0),
                    ts = reader.GetDateTime(1),
                    level = reader.GetString(2),
                    message = reader.GetString(3),
                    payload = reader.GetString(4),
                    source_file = reader.GetString(5),
                    source_offset = reader.GetUInt64(6),
                    ingested_at = reader.GetDateTime(7)
                };

                await _hubContext.Clients.All.SendAsync("NewAlert", alert);
                _logger.LogInformation($"Broadcast new alert: {alert.message}");
                
                _lastCheck = alert.ingested_at;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CheckForNewAlerts");
        }
    }
}
