using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using backend.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using backend.Hubs;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly CouchDbService _db;
        private readonly IHubContext<NoticeHub> _hub;

        public AdminController(CouchDbService db, IHubContext<NoticeHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        // ================= ADMIN CHECK =================
        private bool IsAdmin()
        {
            var role =
                User.FindFirst(ClaimTypes.Role)?.Value ??
                User.FindFirst("role")?.Value;

            return role?.Equals("Admin", StringComparison.OrdinalIgnoreCase) == true;
        }

        // ================= PENDING USERS =================
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingUsers()
        {
            if (!IsAdmin()) return Forbid();

            var users = await _db.GetPendingUsersFromViewAsync();

            if (users == null) return Ok(new List<object>());

            return Ok(users.Select(u => new
            {
                u.email,
                u.firstName,
                u.lastName,
                u.status
            }));
        }

        // ================= APPROVE USER =================
        [HttpPost("approve/{email}")]
        public async Task<IActionResult> ApproveUser(
            string email,
            [FromBody] ApproveUserRequest req)
        {
            if (!IsAdmin()) return Forbid();

            var user = await _db.GetUserAsync(email);
            if (user == null) return NotFound();

            user.status = "Approved";
            user.role = string.IsNullOrEmpty(req.Role) ? "User" : req.Role;

            await _db.UpdateUserAsync(user);

            await _hub.Clients.All.SendAsync("AnalyticsUpdated");

            return Ok(new
            {
                message = "User approved",
                email,
                role = user.role
            });
        }

        // ================= DASHBOARD SUMMARY =================
        [HttpGet("dashboard-summary")]
        public async Task<IActionResult> DashboardSummary()
        {
            if (!IsAdmin()) return Forbid();

            var approvedUsers = await _db.GetApprovedUsersCountAsync();
            var pendingUsers = await _db.GetPendingUsersCountAsync();

            return Ok(new
            {
                totalUsers = approvedUsers + pendingUsers,
                approvedUsers,
                pendingUsers
            });
        }

        // ================= USER GROWTH =================
        [HttpGet("user-growth")]
        public async Task<IActionResult> UserGrowth()
        {
            if (!IsAdmin()) return Forbid();

            var users = await _db.GetAllUsersAsync();

            if (users == null) return Ok(new List<object>());

            var data = users
                .Where(u => u.createdAt != default)
                .GroupBy(u => u.createdAt.ToString("MMM yyyy"))
                .Select(g => new
                {
                    month = g.Key,
                    count = g.Count()
                })
                .OrderBy(x => x.month)
                .ToList();

            return Ok(data);
        }

        // ================= LOGIN ACTIVITY =================
        [HttpGet("login-activity")]
public async Task<IActionResult> LoginActivity()
{
    if (!IsAdmin()) return Forbid();

    var logs = await _db.GetLoginActivityAsync();

    if (logs == null) return Ok(new List<object>());

    // ✅ FIX: Use LoginAt (CouchDB model)
    var data = logs
        .Where(l => l.LoginAt != default)
        .GroupBy(l => new
        {
            day = l.LoginAt.ToString("ddd"),
            hour = l.LoginAt.Hour
        })
        .Select(g => new
        {
            day = g.Key.day,
            hour = g.Key.hour,
            count = g.Count()
        })
        .OrderBy(x => x.day)
        .ThenBy(x => x.hour)
        .ToList();

    return Ok(data);
}
    }

    // ================= DTO =================
    public class ApproveUserRequest
    {
        public string Role { get; set; } = "User";
    }
}