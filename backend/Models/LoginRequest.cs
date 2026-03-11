namespace backend.Models
{
    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool ForceLogin { get; set; } = false;

        // 🔐 DEVICE BINDING
        public string? DeviceId { get; set; }
    }
}