using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using backend.Models;

namespace backend.Services
{
    public class CouchDbService
    {
        private readonly HttpClient _http;
        private readonly string _db;
        private readonly string _loginDb;

        public CouchDbService(IConfiguration config)
        {
            _db = config["CouchDB:Database"]!;
            _loginDb = config["CouchDB:LoginDatabase"]!;
            _http = new HttpClient
            {
                BaseAddress = new Uri(config["CouchDB:Url"]!)
            };

            var auth = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(
                    $"{config["CouchDB:Username"]}:{config["CouchDB:Password"]}"
                )
            );

            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Basic", auth);
        }

        public async Task<bool> UserExistsAsync(string email)
        {
            var res = await _http.GetAsync($"{_db}/{email}");
            return res.IsSuccessStatusCode;
        }

        public async Task<bool> CreateUserAsync(UserDocument user)
        {
            var json = JsonSerializer.Serialize(user);
            var res = await _http.PutAsync(
                $"{_db}/{user._id}",
                new StringContent(json, Encoding.UTF8, "application/json")
            );
            return res.IsSuccessStatusCode;
        }

        public async Task<UserDocument?> GetUserAsync(string email)
        {
            var res = await _http.GetAsync($"{_db}/{email}");
            if (!res.IsSuccessStatusCode) return null;

            var json = await res.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<UserDocument>(json);
        }

        public async Task<List<UserDocument>> GetAllUsersAsync()
        {
            var query = new { selector = new { } };

            var content = new StringContent(
                JsonSerializer.Serialize(query),
                Encoding.UTF8,
                "application/json"
            );

            var res = await _http.PostAsync($"{_db}/_find", content);
            if (!res.IsSuccessStatusCode)
                return new List<UserDocument>();

            var body = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);

            return doc.RootElement
                .GetProperty("docs")
                .EnumerateArray()
                .Select(d => JsonSerializer.Deserialize<UserDocument>(d)!)
                .ToList();
        }

        // ✅ NEW: USE COUCHDB VIEW (NO _find)
        public async Task<List<UserDocument>> GetPendingUsersFromViewAsync()
        {
            var res = await _http.GetAsync(
                $"{_db}/_design/users/_view/pending_users?include_docs=true"
            );

            if (!res.IsSuccessStatusCode)
                return new List<UserDocument>();

            var json = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            return doc.RootElement
                .GetProperty("rows")
                .EnumerateArray()
                .Select(r =>
                    JsonSerializer.Deserialize<UserDocument>(
                        r.GetProperty("doc").GetRawText()
                    )!
                )
                .ToList();
        }

        public async Task<UserDocument?> GetUserByRefreshTokenAsync(string refreshToken)
        {
            var query = new
            {
                selector = new { refreshToken = refreshToken },
                limit = 1
            };

            var content = new StringContent(
                JsonSerializer.Serialize(query),
                Encoding.UTF8,
                "application/json"
            );

            var res = await _http.PostAsync($"{_db}/_find", content);
            if (!res.IsSuccessStatusCode)
                return null;

            var body = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);

            var docs = doc.RootElement.GetProperty("docs");
            if (docs.GetArrayLength() == 0)
                return null;

            return JsonSerializer.Deserialize<UserDocument>(docs[0]);
        }

        public async Task<bool> UpdateUserAsync(UserDocument user)
{
    try
    {
        var json = JsonSerializer.Serialize(user);
        var res = await _http.PutAsync(
            $"{_db}/{user._id}",
            new StringContent(json, Encoding.UTF8, "application/json")
        );
        return res.IsSuccessStatusCode;
    }
    catch
    {
        return false; // 🔥 never crash refresh pipeline
    }
}

        public async Task SaveLoginActivityAsync(LoginActivityDocument doc)
        {
            var json = JsonSerializer.Serialize(doc);
            await _http.PostAsync(
                $"{_loginDb}",
                new StringContent(json, Encoding.UTF8, "application/json")
            );
        }

        public async Task<List<LoginActivityDocument>> GetLoginActivityAsync()
        {
            var query = new { selector = new { } };

            var res = await _http.PostAsync(
                $"{_loginDb}/_find",
                new StringContent(JsonSerializer.Serialize(query), Encoding.UTF8, "application/json")
            );

            if (!res.IsSuccessStatusCode) return new();

            var body = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);

            return doc.RootElement
                .GetProperty("docs")
                .EnumerateArray()
                .Select(d => JsonSerializer.Deserialize<LoginActivityDocument>(d)!)
                .ToList();
        }
        // ✅ COUNT APPROVED USERS (VIEW-BASED)
public async Task<int> GetApprovedUsersCountAsync()
{
    var res = await _http.GetAsync(
        $"{_db}/_design/users/_view/approved_users"
    );

    if (!res.IsSuccessStatusCode)
        return 0;

    var json = await res.Content.ReadAsStringAsync();
    using var doc = JsonDocument.Parse(json);

    return doc.RootElement
        .GetProperty("rows")
        .GetArrayLength();
}

// ✅ COUNT PENDING USERS (VIEW-BASED)
public async Task<int> GetPendingUsersCountAsync()
{
    var res = await _http.GetAsync(
        $"{_db}/_design/users/_view/pending_users"
    );

    if (!res.IsSuccessStatusCode)
        return 0;

    var json = await res.Content.ReadAsStringAsync();
    using var doc = JsonDocument.Parse(json);

    return doc.RootElement
        .GetProperty("rows")
        .GetArrayLength();
}

    }
}
