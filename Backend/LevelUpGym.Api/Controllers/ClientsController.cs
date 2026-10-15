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
    public async Task<ActionResult<IEnumerable<object>>> GetClients()
    {
        var clients = await _context.Clients
            .Include(c => c.Profile)
            .Include(c => c.Subscriptions)
                .ThenInclude(s => s.Membership)
            .Include(c => c.Subscriptions)
                .ThenInclude(s => s.Status)
            .Select(c => new
            {
                c.IdCliente,
                c.Profile,
                fechaRegistro = c.CreatedAt,
                membresiaActiva = c.Subscriptions
                    .Where(s => s.Status.Concepto == "ACTIVO")
                    .Select(s => new { nombre = s.Membership.Nombre })
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(clients);
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
            .Include(a => a.Profile)
                .ThenInclude(p => p.Client)
                    .ThenInclude(c => c.Subscriptions)
                        .ThenInclude(s => s.Status)
            .FirstOrDefaultAsync(a => a.Email == email);

        if (auth == null || auth.Profile == null)
        {
            return NotFound("Perfil no encontrado.");
        }

        var activeStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "ACTIVO");
        int activeStatusId = activeStatus?.IdEstado ?? 1;

        var activeSubscription = auth.Profile.Client?.Subscriptions
            .Where(s => s.DeletedAt == null && (s.IdEstado == activeStatusId || (s.Status != null && s.Status.Concepto == "ACTIVO")))
            .OrderByDescending(s => s.FechaFin)
            .ThenByDescending(s => s.CreatedAt)
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
            activeMembership = activeSubscription != null ? GetMembershipDetails(activeSubscription) : null
        });
    }

    private static object GetMembershipDetails(Subscription sub)
    {
        var planName = sub.Membership?.Nombre?.ToLower() ?? "bronce";
        int sesiones = planName.Contains("oro") ? 30 : (planName.Contains("plata") ? 12 : 0);

        var beneficios = new List<string>
        {
            "Acceso Libre a Sala de Pesas y Zona Cardio",
            "Vestidores y Duchas"
        };

        var servicios = new List<string>
        {
            "Musculación y Fuerza",
            "Zona Cardiovascular"
        };

        if (planName.Contains("plata") || planName.Contains("oro"))
        {
            beneficios.Add("Rutinas de Entrenamiento Guiadas");
            beneficios.Add("Modelo Anatómico 3D Interactivo");
            beneficios.Add("Clases Grupales y Sesiones Dirigidas");

            servicios.Add("Clases Grupales (HIIT, Boxeo, Powerlifting)");
            servicios.Add("Visualizador de Anatomía 3D");
        }

        if (planName.Contains("oro"))
        {
            beneficios.Add("Sesiones Personalizadas con Head Coach");
            beneficios.Add("Asesoría Nutricional Personalizada");

            servicios.Add("Coaching VIP Personalizado");
            servicios.Add("Planes de Nutrición Deportiva");
        }

        return new
        {
            idMembresia = sub.Membership?.IdMembresia ?? 0,
            nombre = sub.Membership?.Nombre ?? "Plan",
            precio = sub.Membership?.Precio ?? 0m,
            descripcion = sub.Membership?.Descripcion ?? "",
            fechaInicio = sub.FechaInicio,
            fechaFin = sub.FechaFin,
            estado = "ACTIVA",
            sesionesIncluidas = sesiones,
            beneficios,
            serviciosIncluidos = servicios
        };
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
                // Remove subscriptions
                var subscriptions = await _context.Subscriptions.Where(s => s.IdCliente == client.IdCliente).ToListAsync();
                _context.Subscriptions.RemoveRange(subscriptions);

                // Remove progress reports
                var progress = await _context.ProgressReports.Where(p => p.IdCliente == client.IdCliente).ToListAsync();
                _context.ProgressReports.RemoveRange(progress);

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