using Octonica.ClickHouseClient;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicy = "Frontend";

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
        policy.WithOrigins("http://127.0.0.1:5173", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// JWT Configuration
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "your-super-secret-key-min-32-chars-long-please-change-this";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SecurityAlertSystem";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SecurityAlertSystemUsers";

// CORS configuration
var defaultCorsOrigins = new[]
{
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000"
};

var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
var envOriginsRaw = builder.Configuration["ALLOWED_ORIGINS"] ?? Environment.GetEnvironmentVariable("ALLOWED_ORIGINS");

string[] allowedOrigins;

if (!string.IsNullOrWhiteSpace(envOriginsRaw))
{
    var envOrigins = envOriginsRaw
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    allowedOrigins = configuredOrigins is { Length: > 0 }
        ? configuredOrigins.Concat(envOrigins).Distinct(StringComparer.OrdinalIgnoreCase).ToArray()
        : envOrigins;
}
else
{
    allowedOrigins = configuredOrigins is { Length: > 0 }
        ? configuredOrigins
        : defaultCorsOrigins;
}

if (allowedOrigins.Length == 0)
{
    allowedOrigins = defaultCorsOrigins;
}

Console.WriteLine($"[CORS] Allowed origins: {string.Join(", ", allowedOrigins)}");

// Add services
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<UserService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "Better than Cisco - Security Monitoring API",
        Version = "Alpha v0.1",
        Description = "Real-time security alert monitoring and management"
    });
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddHostedService<AlertMonitorService>();

var app = builder.Build();

// Initialize users table
var userService = app.Services.GetRequiredService<UserService>();
await userService.InitializeUsersTable();

app.UseRouting();
app.UseCors(CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireCors(CorsPolicy);
app.MapHub<AlertsHub>("/alertsHub").RequireCors(CorsPolicy);

app.UseStaticFiles(); // Enable static files for custom Swagger HTML
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Better than Cisco API v1");
    c.RoutePrefix = "swagger";
    c.IndexStream = () => typeof(Program).Assembly.GetManifestResourceStream("api.wwwroot.swagger-custom.html") 
        ?? File.OpenRead("wwwroot/swagger-custom.html");
});

const string connStr = "Host=127.0.0.1;Port=9000;Database=observability;User=default;";

// Auth endpoints
app.MapPost("/api/auth/login", async (LoginRequest request, JwtService jwtService, UserService userService) =>
{
    if (await userService.ValidatePassword(request.Username, request.Password))
    {
        var user = await userService.GetUserByUsername(request.Username);
        if (user != null)
        {
            var token = jwtService.GenerateToken(user);
            await userService.UpdateLastLogin(user.Id);
            
            return Results.Ok(new LoginResponse
            {
                Token = token,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                ExpiresAt = DateTime.UtcNow.AddHours(24)
            });
        }
    }
    return Results.Unauthorized();
})
.WithName("Login")
.WithTags("Authentication");

app.MapPost("/api/auth/register", async (RegisterRequest request, UserService userService) =>
{
    var existing = await userService.GetUserByUsername(request.Username);
    if (existing != null)
    {
        return Results.BadRequest(new { message = "Username already exists" });
    }

    var user = new User
    {
        Username = request.Username,
        Email = request.Email,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
        Role = "User",
        CreatedAt = DateTime.UtcNow,
        IsActive = true
    };

    await userService.CreateUser(user);
    return Results.Ok(new { message = "User created successfully" });
})
.WithName("Register")
.WithTags("Authentication");

// Dashboard stats
app.MapGet("/api/stats", [Authorize] async () =>
{
    await using var conn = new ClickHouseConnection(connStr);
    await conn.OpenAsync();

    var stats = new SystemStats();

    // Total alerts
    var sql = "SELECT count(*) FROM observability.alerts";
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = sql;
    stats.TotalAlerts = Convert.ToInt64(await cmd.ExecuteScalarAsync());

    // Alerts last 24h
    cmd.CommandText = "SELECT count(*) FROM observability.alerts WHERE ingested_at >= now() - INTERVAL 24 HOUR";
    stats.AlertsLast24h = Convert.ToInt64(await cmd.ExecuteScalarAsync());

    // Alerts last hour
    cmd.CommandText = "SELECT count(*) FROM observability.alerts WHERE ingested_at >= now() - INTERVAL 1 HOUR";
    stats.AlertsLastHour = Convert.ToInt64(await cmd.ExecuteScalarAsync());

    // Alerts over time (last 24 hours, hourly)
    cmd.CommandText = @"
        SELECT 
            toStartOfHour(ingested_at) as hour,
            count(*) as count
        FROM observability.alerts
        WHERE ingested_at >= now() - INTERVAL 24 HOUR
        GROUP BY hour
        ORDER BY hour";
    
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        stats.AlertsOverTime.Add(new TimeSeriesPoint
        {
            Time = reader.GetDateTime(0),
            Count = reader.GetInt64(1)
        });
    }

    return Results.Ok(stats);
})
.WithName("GetStats")
.WithTags("Dashboard")
.RequireAuthorization();

// Get alerts with pagination and filtering
app.MapGet("/api/alerts", [Authorize] async (
    int? limit,
    int? offset,
    DateTime? since,
    DateTime? until,
    string? severity,
    string? sourceIp,
    string? destIp,
    string? sortOrder) =>
{
    await using var conn = new ClickHouseConnection(connStr);
    await conn.OpenAsync();

    var filters = new List<string>();
    if (since.HasValue)
        filters.Add("ts >= @since");
    if (until.HasValue)
        filters.Add("ts <= @until");
    if (!string.IsNullOrEmpty(severity))
        filters.Add("level = @severity");
    if (!string.IsNullOrEmpty(sourceIp))
        filters.Add("coalesce(JSONExtractString(payload, 'src_ip'), '') = @sourceIp");
    if (!string.IsNullOrEmpty(destIp))
        filters.Add("coalesce(JSONExtractString(payload, 'dest_ip'), '') = @destIp");

    var whereClause = filters.Count > 0
        ? "WHERE " + string.Join(" AND ", filters)
        : string.Empty;

    long pageLimit = limit ?? 100;
    if (pageLimit < 1) pageLimit = 1;
    if (pageLimit > 1000) pageLimit = 1000;
    long pageOffset = offset ?? 0;
    if (pageOffset < 0) pageOffset = 0;

    var totalSql = $"SELECT count(*) FROM observability.alerts {whereClause}";
    await using var countCmd = conn.CreateCommand();
    countCmd.CommandText = totalSql;
    if (since.HasValue)
        countCmd.Parameters.AddWithValue("since", since.Value);
    if (!string.IsNullOrEmpty(severity))
        countCmd.Parameters.AddWithValue("severity", severity);
    if (until.HasValue)
        countCmd.Parameters.AddWithValue("until", until.Value);
    if (!string.IsNullOrEmpty(sourceIp))
        countCmd.Parameters.AddWithValue("sourceIp", sourceIp);
    if (!string.IsNullOrEmpty(destIp))
        countCmd.Parameters.AddWithValue("destIp", destIp);
    var total = Convert.ToInt64(await countCmd.ExecuteScalarAsync());

    // Use a subquery to assign stable row numbers based on ingested_at order (oldest first = 1)
    // Apply filters AFTER assigning stable row numbers to all data
    var outerFilters = new List<string>();
    if (since.HasValue)
        outerFilters.Add("ts >= @since");
    if (until.HasValue)
        outerFilters.Add("ts <= @until");
    if (!string.IsNullOrEmpty(severity))
        outerFilters.Add("level = @severity");
    if (!string.IsNullOrEmpty(sourceIp))
        outerFilters.Add("coalesce(JSONExtractString(payload, 'src_ip'), '') = @sourceIp");
    if (!string.IsNullOrEmpty(destIp))
        outerFilters.Add("coalesce(JSONExtractString(payload, 'dest_ip'), '') = @destIp");

    var outerWhereClause = outerFilters.Count > 0
        ? "WHERE " + string.Join(" AND ", outerFilters)
        : string.Empty;

    // Whitelist the sort direction to prevent SQL injection
    var orderByDirection = "DESC"; // Default to DESC
    if (!string.IsNullOrEmpty(sortOrder) && sortOrder.Equals("asc", StringComparison.OrdinalIgnoreCase))
    {
        orderByDirection = "ASC";
    }

    var dataSql = $@"
        SELECT id, ts, level, message, payload, source_file, source_offset, ingested_at, idx
        FROM (
            SELECT 
                id,
                ts,
                level,
                message,
                payload,
                source_file,
                source_offset,
                ingested_at,
                row_number() OVER (ORDER BY ingested_at ASC, ts ASC) AS idx
            FROM observability.alerts
        )
        {outerWhereClause}
        ORDER BY ts {orderByDirection}, ingested_at {orderByDirection}
        LIMIT {pageLimit} OFFSET {pageOffset}";

    await using var cmd = conn.CreateCommand();
    cmd.CommandText = dataSql;
    // ClickHouse LIMIT/OFFSET must be non-null numeric types
    if (since.HasValue)
        cmd.Parameters.AddWithValue("since", since.Value);
    if (until.HasValue)
        cmd.Parameters.AddWithValue("until", until.Value);
    if (!string.IsNullOrEmpty(severity))
        cmd.Parameters.AddWithValue("severity", severity);
    if (!string.IsNullOrEmpty(sourceIp))
        cmd.Parameters.AddWithValue("sourceIp", sourceIp);
    if (!string.IsNullOrEmpty(destIp))
        cmd.Parameters.AddWithValue("destIp", destIp);

    await using var reader = await cmd.ExecuteReaderAsync();
    var results = new List<object>();
    while (await reader.ReadAsync())
    {
        results.Add(new
        {
            index = reader.GetUInt64(8),  // Use the stable idx from the query (UInt64 from row_number)
            id = reader.GetValue(0),
            ts = reader.GetDateTime(1),
            level = reader.GetString(2),
            message = reader.GetString(3),
            payload = reader.GetString(4),
            source_file = reader.GetString(5),
            source_offset = reader.GetUInt64(6),
            ingested_at = reader.GetDateTime(7)
        });
    }

    return Results.Ok(new { data = results, total, limit = pageLimit, offset = pageOffset });
})
.WithName("GetAlerts")
.WithTags("Alerts")
.RequireAuthorization();

// Search alerts
app.MapPost("/api/alerts/search", [Authorize] async (AlertSearchRequest request) =>
{
    await using var conn = new ClickHouseConnection(connStr);
    await conn.OpenAsync();

    var conditions = new List<string> { "1=1" };
    var sql = "SELECT id, ts, level, message, payload, source_file, source_offset, ingested_at FROM observability.alerts WHERE ";

    if (!string.IsNullOrEmpty(request.Query))
        conditions.Add("(message ILIKE @query OR payload ILIKE @query)");
    if (request.StartDate.HasValue)
        conditions.Add("ts >= @startDate");
    if (request.EndDate.HasValue)
        conditions.Add("ts <= @endDate");
    if (!string.IsNullOrEmpty(request.Severity))
        conditions.Add("level = @severity");
    if (!string.IsNullOrEmpty(request.SourceIp))
        conditions.Add("payload ILIKE @sourceIp");
    if (!string.IsNullOrEmpty(request.DestIp))
        conditions.Add("payload ILIKE @destIp");

    sql += string.Join(" AND ", conditions);
    
    // Whitelist the sort direction to prevent SQL injection
    var orderByDirection = "DESC"; // Default to DESC
    if (!string.IsNullOrEmpty(request.SortOrder) && request.SortOrder.Equals("asc", StringComparison.OrdinalIgnoreCase))
    {
        orderByDirection = "ASC";
    }
    sql += $" ORDER BY ts {orderByDirection} LIMIT @limit OFFSET @offset";

    long pageOffset = (request.Page - 1) * request.PageSize;
    if (pageOffset < 0) pageOffset = 0;

    // Total count first
    var countSql = "SELECT count(*) FROM observability.alerts WHERE " + string.Join(" AND ", conditions);
    await using var countCmd = conn.CreateCommand();
    countCmd.CommandText = countSql;
    if (!string.IsNullOrEmpty(request.Query))
        countCmd.Parameters.AddWithValue("query", $"%{request.Query}%");
    if (request.StartDate.HasValue)
        countCmd.Parameters.AddWithValue("startDate", request.StartDate.Value);
    if (request.EndDate.HasValue)
        countCmd.Parameters.AddWithValue("endDate", request.EndDate.Value);
    if (!string.IsNullOrEmpty(request.Severity))
        countCmd.Parameters.AddWithValue("severity", request.Severity);
    if (!string.IsNullOrEmpty(request.SourceIp))
        countCmd.Parameters.AddWithValue("sourceIp", $"%{request.SourceIp}%");
    if (!string.IsNullOrEmpty(request.DestIp))
        countCmd.Parameters.AddWithValue("destIp", $"%{request.DestIp}%");

    var total = Convert.ToInt64(await countCmd.ExecuteScalarAsync());

    // Paged data
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = sql;
    // Avoid nullable ints in ClickHouse LIMIT/OFFSET by inlining numeric values
    cmd.CommandText = cmd.CommandText.Replace("LIMIT @limit OFFSET @offset", $"LIMIT {request.PageSize} OFFSET {pageOffset}");
    if (!string.IsNullOrEmpty(request.Query))
        cmd.Parameters.AddWithValue("query", $"%{request.Query}%");
    if (request.StartDate.HasValue)
        cmd.Parameters.AddWithValue("startDate", request.StartDate.Value);
    if (request.EndDate.HasValue)
        cmd.Parameters.AddWithValue("endDate", request.EndDate.Value);
    if (!string.IsNullOrEmpty(request.Severity))
        cmd.Parameters.AddWithValue("severity", request.Severity);
    if (!string.IsNullOrEmpty(request.SourceIp))
        cmd.Parameters.AddWithValue("sourceIp", $"%{request.SourceIp}%");
    if (!string.IsNullOrEmpty(request.DestIp))
        cmd.Parameters.AddWithValue("destIp", $"%{request.DestIp}%");

    await using var reader = await cmd.ExecuteReaderAsync();
    var results = new List<object>();
    var rowNumber = 0;
    while (await reader.ReadAsync())
    {
        var index = total - (pageOffset + rowNumber);
        results.Add(new
        {
            index,
            id = reader.GetValue(0),
            ts = reader.GetDateTime(1),
            level = reader.GetString(2),
            message = reader.GetString(3),
            payload = reader.GetString(4),
            source_file = reader.GetString(5),
            source_offset = reader.GetUInt64(6),
            ingested_at = reader.GetDateTime(7)
        });
        rowNumber++;
    }

    return Results.Ok(new { data = results, total, page = request.Page, pageSize = request.PageSize });
})
.WithName("SearchAlerts")
.WithTags("Alerts")
.RequireAuthorization();

// Delete alerts
app.MapPost("/api/alerts/delete", [Authorize(Roles = "Admin,Analyst")] async (BulkDeleteRequest request) =>
{
    await using var conn = new ClickHouseConnection(connStr);
    await conn.OpenAsync();

    if (request.DeleteAll)
    {
        var sql = "ALTER TABLE observability.alerts DELETE WHERE 1=1";
        if (request.OlderThan.HasValue)
            sql += " AND ts < @olderThan";
            
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        if (request.OlderThan.HasValue)
            cmd.Parameters.AddWithValue("olderThan", request.OlderThan.Value);
        await cmd.ExecuteNonQueryAsync();
    }
    else if (request.Ids.Count > 0)
    {
        var sql = "ALTER TABLE observability.alerts DELETE WHERE id IN @ids";
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("ids", request.Ids);
        await cmd.ExecuteNonQueryAsync();
    }

    return Results.Ok(new { message = "Alerts deleted successfully" });
})
.WithName("DeleteAlerts")
.WithTags("Alerts")
.RequireAuthorization();

// Export alerts
app.MapGet("/api/alerts/export", [Authorize] async (string format = "json") =>
{
    await using var conn = new ClickHouseConnection(connStr);
    await conn.OpenAsync();

    var sql = "SELECT * FROM observability.alerts ORDER BY ts DESC LIMIT 10000";
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = sql;
    await using var reader = await cmd.ExecuteReaderAsync();
    
    var results = new List<object>();
    while (await reader.ReadAsync())
    {
        results.Add(new
        {
            id = reader.GetValue(0),
            ts = reader.GetDateTime(1),
            level = reader.GetString(2),
            message = reader.GetString(3),
            payload = reader.GetString(4)
        });
    }

    if (format == "csv")
    {
        var csv = "Id,Timestamp,Level,Message\n";
        foreach (dynamic alert in results)
        {
            csv += $"{alert.id},{alert.ts},{alert.level},\"{alert.message}\"\n";
        }
        return Results.Text(csv, "text/csv");
    }

    return Results.Ok(results);
})
.WithName("ExportAlerts")
.WithTags("Alerts")
.RequireAuthorization();

app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run();
