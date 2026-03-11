using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using backend.Data;
using backend.Models;
using backend.Hubs;
using backend.Services;
using System.Security.Claims;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/notice")]
    public class NoticeController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<NoticeHub> _hub;
        private readonly RsaEncryptionService _rsa;

        public NoticeController(
            AppDbContext context,
            IHubContext<NoticeHub> hub,
            RsaEncryptionService rsa)
        {
            _context = context;
            _hub = hub;
            _rsa = rsa;
        }

        // 🔹 ADMIN + USER CREATE NOTICE
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateNotice([FromBody] NoticeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest("Message is required");

            var role = User.FindFirstValue(ClaimTypes.Role);

            // USER CAN SEND ONLY TO ADMIN
            if (role == "User" &&
                !request.ReceiverRole.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                return Forbid();
            }

            var encryptedMessage = _rsa.Encrypt(request.Message);

            var notice = new Notice
            {
                Message = encryptedMessage,
                SenderRole = role,
                ReceiverRole = request.ReceiverRole,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notices.Add(notice);
            await _context.SaveChangesAsync();

            var payload = new
            {
                message = request.Message, // send decrypted to client
                sender = role,
                createdAt = notice.CreatedAt
            };

            if (request.ReceiverRole.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                await _hub.Clients.All
                    .SendAsync("ReceiveNotice", payload);
            }
            else
            {
                await _hub.Clients
                    .Group(request.ReceiverRole)
                    .SendAsync("ReceiveNotice", payload);
            }

            return Ok(new { message = "Notice created" });
        }

        // 🔹 FETCH NOTICE HISTORY
        [HttpGet]
        [Authorize]
        public IActionResult GetNotices()
        {
            var role = User.FindFirstValue(ClaimTypes.Role)?.ToLower();

            var notices = _context.Notices
                .Where(n =>
                    n.ReceiverRole.ToLower() == "all" ||
                    n.ReceiverRole.ToLower() == role)
                .OrderByDescending(n => n.CreatedAt)
                .AsEnumerable()
                .Select(n => new
                {
                    message = SafeDecrypt(n.Message),
                    sender = n.SenderRole,
                    createdAt = n.CreatedAt
                })
                .ToList();

            return Ok(notices);
        }

        private string SafeDecrypt(string cipherText)
        {
            try
            {
                return _rsa.Decrypt(cipherText);
            }
            catch
            {
                return cipherText;
            }
        }
    }

    // 🔹 REQUEST DTO
    public class NoticeRequest
    {
        public string Message { get; set; } = string.Empty;
        public string ReceiverRole { get; set; } = "All";
    }
}
