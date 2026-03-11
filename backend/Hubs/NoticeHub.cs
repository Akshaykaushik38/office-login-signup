using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace backend.Hubs
{
    [Authorize]
    public class NoticeHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

            if (role == "Admin")
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "Admin");
            }
            else if (role == "User")
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "User");
            }

            await base.OnConnectedAsync();
        }
        public async Task NotifyAnalyticsUpdated()
        {
            await Clients.Group("Admin")
            .SendAsync("AnalyticsUpdated");
        }

    }
}
