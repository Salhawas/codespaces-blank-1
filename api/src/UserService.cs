using Octonica.ClickHouseClient;

public class UserService
{
    private const string connStr = "Host=clickhouse;Port=9000;Database=observability;User=vector;Password=vector;";
    private readonly ILogger<UserService> _logger;

    public UserService(ILogger<UserService> logger)
    {
        _logger = logger;
    }

    public async Task InitializeUsersTable()
    {
        try
        {
            await using var conn = new ClickHouseConnection(connStr);
            await conn.OpenAsync();

            var createTableSql = @"
                CREATE TABLE IF NOT EXISTS observability.users (
                    id UInt32,
                    username String,
                    email String,
                    password_hash String,
                    role LowCardinality(String) DEFAULT 'User',
                    created_at DateTime64(3, 'UTC') DEFAULT now64(),
                    last_login_at Nullable(DateTime64(3, 'UTC')),
                    is_active UInt8 DEFAULT 1
                ) ENGINE = MergeTree()
                ORDER BY (id, username)";

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = createTableSql;
            await cmd.ExecuteNonQueryAsync();

            // Create default admin user if none exists
            var countSql = "SELECT count(*) FROM observability.users";
            cmd.CommandText = countSql;
            var count = await cmd.ExecuteScalarAsync();
            
            if (Convert.ToInt64(count) == 0)
            {
                var admin = new User
                {
                    Id = 1,
                    Username = "admin",
                    Email = "admin@security-alerts.local",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Role = "Admin",
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                await CreateUser(admin);
                _logger.LogInformation("Created default admin user (username: admin, password: admin123)");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize users table");
        }
    }

    public async Task<User?> GetUserByUsername(string username)
    {
        await using var conn = new ClickHouseConnection(connStr);
        await conn.OpenAsync();

        var sql = "SELECT id, username, email, password_hash, role, created_at, last_login_at, is_active FROM observability.users WHERE username = @username LIMIT 1";
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("username", username);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new User
            {
                Id = Convert.ToInt32(reader.GetValue(0)),
                Username = reader.GetString(1),
                Email = reader.GetString(2),
                PasswordHash = reader.GetString(3),
                Role = reader.GetString(4),
                CreatedAt = reader.GetDateTime(5),
                LastLoginAt = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
                IsActive = reader.GetByte(7) == 1
            };
        }

        return null;
    }

    public async Task<User?> CreateUser(User user)
    {
        await using var conn = new ClickHouseConnection(connStr);
        await conn.OpenAsync();

        // Get next ID
        var maxIdSql = "SELECT coalesce(max(id), 0) + 1 FROM observability.users";
        await using var idCmd = conn.CreateCommand();
        idCmd.CommandText = maxIdSql;
        user.Id = Convert.ToInt32(await idCmd.ExecuteScalarAsync());

        var sql = @"INSERT INTO observability.users (id, username, email, password_hash, role, created_at, is_active) 
                   VALUES (@id, @username, @email, @passwordHash, @role, @createdAt, @isActive)";
        
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("id", user.Id);
        cmd.Parameters.AddWithValue("username", user.Username);
        cmd.Parameters.AddWithValue("email", user.Email);
        cmd.Parameters.AddWithValue("passwordHash", user.PasswordHash);
        cmd.Parameters.AddWithValue("role", user.Role);
        cmd.Parameters.AddWithValue("createdAt", user.CreatedAt);
        cmd.Parameters.AddWithValue("isActive", user.IsActive ? 1 : 0);

        await cmd.ExecuteNonQueryAsync();
        return user;
    }

    public async Task UpdateLastLogin(int userId)
    {
        await using var conn = new ClickHouseConnection(connStr);
        await conn.OpenAsync();

        var sql = "ALTER TABLE observability.users UPDATE last_login_at = now64() WHERE id = @id";
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("id", userId);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<bool> ValidatePassword(string username, string password)
    {
        var user = await GetUserByUsername(username);
        if (user == null || !user.IsActive) return false;
        return BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
    }
}
