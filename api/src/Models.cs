public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "User"; // Admin, Analyst, User
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class AlertSearchRequest
{
    public string? Query { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Severity { get; set; }
    public string? SourceIp { get; set; }
    public string? DestIp { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? SortOrder { get; set; }
}

public class BulkDeleteRequest
{
    public List<string> Ids { get; set; } = new();
    public bool DeleteAll { get; set; } = false;
    public DateTime? OlderThan { get; set; }
}

public class SystemStats
{
    public long TotalAlerts { get; set; }
    public long AlertsLast24h { get; set; }
    public long AlertsLastHour { get; set; }
    public long CriticalAlerts { get; set; }
    public Dictionary<string, long> AlertsBySeverity { get; set; } = new();
    public Dictionary<string, long> TopSourceIPs { get; set; } = new();
    public List<TimeSeriesPoint> AlertsOverTime { get; set; } = new();
}

public class TimeSeriesPoint
{
    public DateTime Time { get; set; }
    public long Count { get; set; }
}
