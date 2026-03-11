using Microsoft.AspNetCore.Mvc;
using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        //  Country-wise login count
        [HttpGet("geo/countries")]
        public async Task<IActionResult> GetCountryWiseLogins()
        {
            var data = await _context.LoginLogs
                .GroupBy(l => l.Country)
                .Select(g => new
                {
                    country = g.Key,
                    count = g.Count()
                })
                .OrderByDescending(x => x.count)
                .ToListAsync();

            return Ok(data);
        }
    }
}
