using System;

namespace backend.Models
{
    public class LoginLog
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        public DateTime LoginTime { get; set; }

        public string Country { get; set; } = string.Empty;

        public string City { get; set; } = string.Empty;
    }
}
