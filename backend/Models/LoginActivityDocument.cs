using System;

namespace backend.Models
{
    public class LoginActivityDocument
    {
        public string _id { get; set; } = Guid.NewGuid().ToString();

        public string Email { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public DateTime LoginAt { get; set; } = DateTime.UtcNow;
    }
}
