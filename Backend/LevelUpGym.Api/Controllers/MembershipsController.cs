using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MembershipsController : ControllerBase
{
    private readonly LevelUpDbContext _context;

    public MembershipsController(LevelUpDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Membership>>> GetMemberships()
    {
        return await _context.Memberships.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Membership>> GetMembership(int id)
    {
        var membership = await _context.Memberships.FindAsync(id);

        if (membership == null)
        {
            return NotFound();
        }

        return membership;
    }

    [Authorize]
    [HttpPost("purchase/{id}")]
    public async Task<IActionResult> PurchaseMembership(int id)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (email == null) return Unauthorized();

        var auth = await _context.Auths.Include(a => a.Profile).ThenInclude(p => p.Client)
            .FirstOrDefaultAsync(a => a.Email == email);

        if (auth?.Profile?.Client == null) return BadRequest("User or client not found.");

        var membership = await _context.Memberships.FindAsync(id);
        if (membership == null) return NotFound(new { message = $"La membresía con ID {id} no existe en el sistema. Asegúrate de que el seeder haya cargado los datos correctamente." });

        // Check for active status
        var status = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "ACTIVO")
            ?? new SubscriptionStatus { Concepto = "ACTIVO" };

        if (status.IdEstado == 0) 
        {
            _context.SubscriptionStatuses.Add(status);
            await _context.SaveChangesAsync();
        }

        var subscription = new Subscription
        {
            IdCliente = auth.Profile.Client.IdCliente,
            IdMembresia = id,
            IdEstado = status.IdEstado,
            FechaInicio = DateOnly.FromDateTime(DateTime.Now),
            FechaFin = DateOnly.FromDateTime(DateTime.Now.AddMonths(1)),
            CreatedAt = DateTime.UtcNow
        };

        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Membresía activada con éxito", expiresAt = subscription.FechaFin });
    }
}
