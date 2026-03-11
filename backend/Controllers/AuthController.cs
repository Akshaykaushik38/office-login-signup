using Microsoft.AspNetCore.Mvc;
using backend.Models;
using backend.Services;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using backend.Data;
using System.Text;
using Microsoft.AspNetCore.SignalR;
using backend.Hubs;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private static readonly SemaphoreSlim RefreshLock = new(1, 1);
        private readonly IConfiguration _config;
        private readonly CouchDbService _db;
        private readonly AppDbContext _context;
        private readonly IHubContext<NoticeHub> _hub;

        public AuthController(
            IConfiguration config,
            CouchDbService db,
            AppDbContext context,
            IHubContext<NoticeHub> hub)
        {
            _config = config;
            _db = db;
            _context = context;
            _hub = hub;
        }

        // ---------------- SIGNUP ----------------
        [HttpPost("signup")]
        public async Task<IActionResult> Signup(SignupRequest req)
        {
            if (req.Password != req.ConfirmPassword)
                return BadRequest("Passwords do not match");

            var existingUser = await _db.GetUserAsync(req.Email);
            if (existingUser != null)
                return BadRequest("User already exists");

            var user = new UserDocument
            {
                _id = req.Email,
                email = req.Email,
                firstName = req.FirstName,
                lastName = req.LastName,
                password = BCrypt.Net.BCrypt.HashPassword(req.Password),
                role = req.Role,
                status = "Pending"
            };

            await _db.CreateUserAsync(user);
            await _hub.Clients.All.SendAsync("AnalyticsUpdated");

            return Ok("Signup successful");
        }

        // ---------------- LOGIN ----------------
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest req)
        {
            var jwt = _config.GetSection("Jwt");
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt["Key"]!)
            );

            var user = await _db.GetUserAsync(req.Email);

            if (user == null)
                return Unauthorized("User not found");

            if (!BCrypt.Net.BCrypt.Verify(req.Password, user.password))
                return Unauthorized("Invalid credentials");

            if (user.status != "Approved")
                return Unauthorized("Not approved");

            if (!string.IsNullOrEmpty(user.activeSessionId) && !req.ForceLogin)
                return BadRequest("ALREADY_LOGGED_IN");

            var deviceId =
                Request.Headers["X-Device-Id"].FirstOrDefault()
                ?? req.DeviceId;

            if (string.IsNullOrWhiteSpace(deviceId))
                return Unauthorized("Device ID missing");

            var refreshToken = GenerateRefreshToken();
            var sessionId = Guid.NewGuid().ToString();
            var jti = Guid.NewGuid().ToString();
            var tabId = Guid.NewGuid().ToString(); // ✅ SERVER

            // 🔐 Save session
            user.activeSessionId = sessionId;
            user.activeJti = jti;
            user.deviceId = deviceId;
            user.refreshToken = refreshToken;
            user.refreshTokenExpiry = DateTime.UtcNow.AddMinutes(15);
            user.tabId = tabId;

            await _db.UpdateUserAsync(user);

            // 🔐 Refresh Token Cookie
            Response.Cookies.Append(
                "refreshToken",
                refreshToken,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.None,
                    Expires = user.refreshTokenExpiry
                });

            // 🔐 Tab Cookie
            Response.Cookies.Append(
                "tab_id",
                tabId,
                new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.None,
                    Expires = user.refreshTokenExpiry
                });

            return Ok(new
            {
                token = CreateToken(user.email, user.role, sessionId, jti, key, jwt)
            });
        }

        // ---------------- REFRESH ----------------
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            await RefreshLock.WaitAsync();

            try
            {
                var oldToken = Request.Cookies["refreshToken"];

                if (string.IsNullOrEmpty(oldToken))
                    return Unauthorized();

                var user = await _db.GetUserByRefreshTokenAsync(oldToken);

                if (user == null || user.refreshTokenExpiry < DateTime.UtcNow)
                    return Unauthorized();

                var newToken = GenerateRefreshToken();
                var newJti = Guid.NewGuid().ToString();
                var newTabId = Guid.NewGuid().ToString(); // ✅ ROTATE TAB

                // 🔐 Rotate everything
                user.refreshToken = newToken;
                user.refreshTokenExpiry = DateTime.UtcNow.AddMinutes(15);
                user.activeJti = newJti;
                user.tabId = newTabId;

                await _db.UpdateUserAsync(user);

                // 🔐 New refresh cookie
                Response.Cookies.Append(
                    "refreshToken",
                    newToken,
                    new CookieOptions
                    {
                        HttpOnly = true,
                        Secure = true,
                        SameSite = SameSiteMode.None,
                        Expires = user.refreshTokenExpiry
                    });

                // 🔐 New tab cookie
                Response.Cookies.Append(
                    "tab_id",
                    newTabId,
                    new CookieOptions
                    {
                        HttpOnly = true,
                        Secure = true,
                        SameSite = SameSiteMode.None,
                        Expires = user.refreshTokenExpiry
                    });

                var jwt = _config.GetSection("Jwt");
                var key = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwt["Key"]!)
                );

                return Ok(new
                {
                    token = CreateToken(
                        user.email,
                        user.role,
                        user.activeSessionId!,
                        newJti,
                        key,
                        jwt)
                });
            }
            finally
            {
                RefreshLock.Release();
            }
        }

        // ---------------- VALIDATE ----------------
        [Authorize]
        [HttpGet("validate")]
        public IActionResult Validate() => Ok();

        // ---------------- LOGOUT ----------------
        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var email = User.FindFirst(ClaimTypes.Email)?.Value;

            if (!string.IsNullOrEmpty(email))
            {
                var user = await _db.GetUserAsync(email);

                if (user != null)
                {
                    user.activeSessionId = null;
                    user.activeJti = null;
                    user.deviceId = null;
                    user.tabId = null;
                    user.refreshToken = null;
                    user.refreshTokenExpiry = null;

                    await _db.UpdateUserAsync(user);
                }
            }

            Response.Cookies.Delete("refreshToken");
            Response.Cookies.Delete("tab_id");

            return Ok();
        }

        // ---------------- TOKEN ----------------
        private string CreateToken(
            string email,
            string role,
            string sessionId,
            string jti,
            SymmetricSecurityKey key,
            IConfigurationSection jwt)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role),
                new Claim("sessionId", sessionId),
                new Claim(JwtRegisteredClaimNames.Jti, jti)
            };

            var token = new JwtSecurityToken(
                jwt["Issuer"],
                jwt["Audience"],
                claims,
                expires: DateTime.UtcNow.AddMinutes(15),
                signingCredentials:
                    new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string GenerateRefreshToken()
        {
            return Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        }
    }
}