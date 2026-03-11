using System.Text.Json.Serialization;

namespace backend.Models
{
    public class UserDocument
    {
        [JsonPropertyName("_id")]
        public string _id { get; set; } = null!;

        [JsonPropertyName("_rev")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? _rev { get; set; }

        public string firstName { get; set; } = null!;
        public string lastName { get; set; } = null!;
        public string email { get; set; } = null!;
        public string password { get; set; } = null!;
        public string role { get; set; } = "User";
        public string status { get; set; } = "Pending";

        public string? activeSessionId { get; set; }
        public string? activeJti { get; set; }

        // 🔐 DEVICE SESSION BINDING (NEW – REQUIRED)
        public string? deviceId { get; set; }

        public string? refreshToken { get; set; }
        public DateTime? refreshTokenExpiry { get; set; }

        public DateTime createdAt { get; set; } = DateTime.UtcNow;

        public string? country { get; set; } = "India";
        public string? city { get; set; }
        
        public string? userAgent { get; set; }
        public string? tabId { get; set; }
    }
}