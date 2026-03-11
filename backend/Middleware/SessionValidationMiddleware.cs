using Microsoft.AspNetCore.Http;
using backend.Services;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace backend.Middleware
{
    public class SessionValidationMiddleware
    {
        private readonly RequestDelegate _next;

        public SessionValidationMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context, CouchDbService db)
        {
            var path = context.Request.Path.Value?.ToLower();

            // Skip auth
            if (path != null && path.StartsWith("/api/auth"))
            {
                await _next(context);
                return;
            }

            // Skip SignalR
            if (path != null && path.Contains("noticehub"))
            {
                await _next(context);
                return;
            }

            // Must be authenticated
            if (context.User.Identity?.IsAuthenticated != true)
            {
                context.Response.StatusCode = 401;
                return;
            }

            // ===============================
            // Extract Security Data
            // ===============================

            var email = context.User.FindFirst(ClaimTypes.Email)?.Value;
            var jti = context.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
            var sessionId = context.User.FindFirst("sessionId")?.Value;

            var deviceId = context.Request.Headers["X-Device-Id"].ToString();
            var tabIdFromCookie = context.Request.Cookies["tab_id"];

            if (string.IsNullOrWhiteSpace(email) ||
                string.IsNullOrWhiteSpace(jti) ||
                string.IsNullOrWhiteSpace(sessionId) ||
                string.IsNullOrWhiteSpace(deviceId))
            {
                context.Response.StatusCode = 401;
                return;
            }

            // ===============================
            // Fetch User
            // ===============================

            var user = await db.GetUserAsync(email);

            if (user == null)
            {
                context.Response.StatusCode = 401;
                return;
            }

            // ===============================
            // TAB SYNC FIX (CRITICAL)
            // ===============================

            // If DB has tabId but cookie is missing → restore once
            if (string.IsNullOrWhiteSpace(tabIdFromCookie) &&
                !string.IsNullOrWhiteSpace(user.tabId))
            {
                context.Response.Cookies.Append(
                    "tab_id",
                    user.tabId,
                    new CookieOptions
                    {
                        HttpOnly = true,
                        Secure = true,
                        SameSite = SameSiteMode.None,
                        Expires = user.refreshTokenExpiry
                    });

                tabIdFromCookie = user.tabId;
            }

            // ===============================
            // HARD VALIDATION
            // ===============================

            bool valid =
                user.activeJti == jti &&
                user.activeSessionId == sessionId &&
                user.deviceId == deviceId &&
                user.tabId == tabIdFromCookie;

            if (!valid)
            {
                context.Response.StatusCode = 401;
                return;
            }

            await _next(context);
        }
    }
}