using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminStatsController : ControllerBase
{
    private readonly LevelUpDbContext _context;

    private static readonly string[] MonthNames =
        { "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic" };

    public AdminStatsController(LevelUpDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats/revenue-by-month")]
    public async Task<ActionResult> GetRevenueByMonth()
    {
        // Se usa FechaInicio (DateOnly, no-nullable) en vez de CreatedAt para evitar
        // problemas con registros donde CreatedAt pudiera venir null.
        var result = await _context.Subscriptions
            .Include(s => s.Membership)
            .GroupBy(s => new { s.FechaInicio.Year, s.FechaInicio.Month })
            .Select(g => new
            {
                year = g.Key.Year,
                monthNum = g.Key.Month,
                total = g.Sum(s => s.Membership.Precio ?? 0)
            })
            .OrderBy(g => g.year).ThenBy(g => g.monthNum)
            .ToListAsync();

        var formatted = result.Select(r => new
        {
            month = $"{MonthNames[r.monthNum - 1]} {r.year}",
            total = r.total
        });

        return Ok(formatted);
    }
}