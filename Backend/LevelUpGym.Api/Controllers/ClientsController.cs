using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClientsController : ControllerBase
{
    private readonly LevelUpDbContext _context;

    public ClientsController(LevelUpDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Client>>> GetClients()
    {
        return await _context.Clients
            .Include(c => c.Profile)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Client>> GetClient(int id)
    {
        var client = await _context.Clients
            .Include(c => c.Profile)
            .FirstOrDefaultAsync(c => c.IdCliente == id);

        if (client == null)
        {
            return NotFound();
        }

        return client;
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<ActionResult<object>> GetProfile()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (email == null) return Unauthorized();

        var auth = await _context.Auths
            .Include(a => a.Profile)
                .ThenInclude(p => p.Client)
                    .ThenInclude(c => c.Subscriptions)
                        .ThenInclude(s => s.Membership)
            .FirstOrDefaultAsync(a => a.Email == email);

        if (auth == null || auth.Profile == null)
        {
            return NotFound("Perfil no encontrado.");
        }

        var activeSubscription = auth.Profile.Client?.Subscriptions
            .Where(s => s.IdEstado == 1 || s.Status.Concepto == "ACTIVO")
            .OrderByDescending(s => s.FechaFin)
            .FirstOrDefault();

        return Ok(new
        {
            email = auth.Email,
            nombre = auth.Profile.Nombre,
            apellidos = auth.Profile.Apellidos,
            tipoDocumento = auth.Profile.TipoDocumento,
            numDocumento = auth.Profile.NumDocumento,
            sexo = auth.Profile.Sexo,
            telefono = auth.Profile.Telefono,
            peso = auth.Profile.Peso,
            estatura = auth.Profile.Estatura,
            activeMembership = activeSubscription != null ? new
            {
                nombre = activeSubscription.Membership.Nombre,
                descripcion = activeSubscription.Membership.Descripcion,
                fechaFin = activeSubscription.FechaFin
            } : null
        });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (email == null) return Unauthorized();

        var auth = await _context.Auths
            .Include(a => a.Profile)
            .FirstOrDefaultAsync(a => a.Email == email);

        if (auth == null || auth.Profile == null)
        {
            return NotFound("Perfil no encontrado.");
        }

        auth.Profile.Nombre = request.Nombre;
        auth.Profile.Apellidos = request.Apellidos;
        auth.Profile.Telefono = request.Telefono;
        auth.Profile.Sexo = request.Sexo;
        auth.Profile.Peso = request.Peso;
        auth.Profile.Estatura = request.Estatura;
        auth.Profile.UpdatedAt = DateTime.UtcNow;

        _context.Entry(auth.Profile).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Perfil actualizado exitosamente." });
    }

    [Authorize]
    [HttpDelete("profile")]
    public async Task<IActionResult> DeleteProfile()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (email == null) return Unauthorized();

        var auth = await _context.Auths
            .Include(a => a.Profile)
                .ThenInclude(p => p.Client)
            .FirstOrDefaultAsync(a => a.Email == email);

        if (auth == null)
        {
            return NotFound("Usuario no encontrado.");
        }

        var profile = auth.Profile;
        if (profile != null)
        {
            var client = profile.Client;
            if (client != null)
            {
                // Disassociate from sales
                var sales = await _context.Sales.Where(s => s.IdCliente == client.IdCliente).ToListAsync();
                foreach (var sale in sales)
                {
                    sale.IdCliente = null;
                }

                // Remove subscriptions
                var subscriptions = await _context.Subscriptions.Where(s => s.IdCliente == client.IdCliente).ToListAsync();
                _context.Subscriptions.RemoveRange(subscriptions);

                // Remove progress reports
                var progress = await _context.ProgressReports.Where(p => p.IdCliente == client.IdCliente).ToListAsync();
                _context.ProgressReports.RemoveRange(progress);

                // Remove carts & items
                var carts = await _context.Carts.Include(c => c.Items).Where(c => c.IdCliente == client.IdCliente).ToListAsync();
                foreach (var cart in carts)
                {
                    _context.CartItems.RemoveRange(cart.Items);
                }
                _context.Carts.RemoveRange(carts);

                _context.Clients.Remove(client);
            }

            // Remove user roles
            var userRoles = await _context.UserRoles.Where(ur => ur.IdAuth == auth.IdAuth).ToListAsync();
            _context.UserRoles.RemoveRange(userRoles);

            _context.Auths.Remove(auth);
            _context.Profiles.Remove(profile);
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Cuenta eliminada exitosamente." });
    }
}

public class UpdateProfileRequest
{
    public string Nombre { get; set; } = null!;
    public string Apellidos { get; set; } = null!;
    public string? Telefono { get; set; }
    public string? Sexo { get; set; }
    public decimal? Peso { get; set; }
    public decimal? Estatura { get; set; }
}

