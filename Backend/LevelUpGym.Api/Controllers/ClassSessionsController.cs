using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.Models;
using LevelUpGym.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Globalization;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClassSessionsController : ControllerBase
{
    private readonly LevelUpDbContext _context;

    public ClassSessionsController(LevelUpDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ClassSessionDto>>> GetClasses()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        int? currentClientId = null;

        if (email != null)
        {
            var auth = await _context.Auths
                .Include(a => a.Profile).ThenInclude(p => p.Client)
                .FirstOrDefaultAsync(a => a.Email == email);
            currentClientId = auth?.Profile?.Client?.IdCliente;
        }

        var classes = await _context.ClassSessions
            .Include(c => c.Entrenador).ThenInclude(e => e.Profile)
            .Include(c => c.Enrollments)
            .OrderByDescending(c => c.Fecha).ThenBy(c => c.HoraInicio)
            .ToListAsync();

        var dtos = classes.Select(c => MapToDto(c, currentClientId)).ToList();
        return Ok(dtos);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ClassSessionDto>> CreateClass(CreateClassSessionDto request)
    {
        // En una app real, validaríamos que el usuario tenga rol Admin.
        
        var date = DateOnly.ParseExact(request.Fecha, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        var time = TimeSpan.ParseExact(request.HoraInicio, "hh\\:mm", CultureInfo.InvariantCulture);

        var newClass = new ClassSession
        {
            IdEntrenador = request.IdEntrenador,
            Nombre = request.Nombre,
            Fecha = date,
            HoraInicio = time,
            CapacidadMaxima = request.CapacidadMaxima,
            Estado = "Programada"
        };

        _context.ClassSessions.Add(newClass);
        await _context.SaveChangesAsync();

        // Reload to get the Entrenador details
        var created = await _context.ClassSessions
            .Include(c => c.Entrenador).ThenInclude(e => e.Profile)
            .FirstAsync(c => c.IdClass == newClass.IdClass);

        return Ok(MapToDto(created, null));
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteClass(int id)
    {
        var classSession = await _context.ClassSessions.FindAsync(id);
        if (classSession == null) return NotFound();

        _context.ClassSessions.Remove(classSession);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [Authorize]
    [HttpPost("{id}/enroll")]
    public async Task<IActionResult> Enroll(int id)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (email == null) return Unauthorized();

        var auth = await _context.Auths
            .Include(a => a.Profile).ThenInclude(p => p.Client)
                .ThenInclude(c => c.Subscriptions)
                    .ThenInclude(s => s.Membership)
            .FirstOrDefaultAsync(a => a.Email == email);

        if (auth?.Profile?.Client == null) return BadRequest("Client not found.");

        var client = auth.Profile.Client;

        // Verificar membresía
        var activeSub = client.Subscriptions
            .Where(s => s.IdEstado == 1 || s.Status.Concepto == "ACTIVO")
            .OrderByDescending(s => s.FechaFin)
            .FirstOrDefault();

        if (activeSub == null || (!activeSub.Membership.Nombre.ToLower().Contains("plata") && !activeSub.Membership.Nombre.ToLower().Contains("oro")))
        {
            return BadRequest(new { message = "Se requiere membresía Plata u Oro para inscribirse en clases." });
        }

        var classSession = await _context.ClassSessions
            .Include(c => c.Enrollments)
            .FirstOrDefaultAsync(c => c.IdClass == id);

        if (classSession == null) return NotFound("Clase no encontrada.");

        if (classSession.Enrollments.Count >= classSession.CapacidadMaxima)
        {
            return BadRequest(new { message = "La clase ya ha alcanzado su capacidad máxima." });
        }

        if (classSession.Enrollments.Any(e => e.IdCliente == client.IdCliente))
        {
            return BadRequest(new { message = "Ya te encuentras inscrito en esta clase." });
        }

        var enrollment = new ClassEnrollment
        {
            IdClass = id,
            IdCliente = client.IdCliente
        };

        _context.ClassEnrollments.Add(enrollment);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Inscripción exitosa." });
    }

    [Authorize]
    [HttpDelete("{id}/enroll")]
    public async Task<IActionResult> Unenroll(int id)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (email == null) return Unauthorized();

        var auth = await _context.Auths
            .Include(a => a.Profile).ThenInclude(p => p.Client)
            .FirstOrDefaultAsync(a => a.Email == email);

        if (auth?.Profile?.Client == null) return BadRequest("Client not found.");

        var enrollment = await _context.ClassEnrollments
            .FirstOrDefaultAsync(e => e.IdClass == id && e.IdCliente == auth.Profile.Client.IdCliente);

        if (enrollment == null) return NotFound("No te encuentras inscrito en esta clase.");

        _context.ClassEnrollments.Remove(enrollment);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Inscripción cancelada." });
    }

    private ClassSessionDto MapToDto(ClassSession c, int? currentClientId)
    {
        // Format Fecha: "18 de Agosto, 2026"
        string[] meses = { "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre" };
        var fechaFormatted = $"{c.Fecha.Day} de {meses[c.Fecha.Month - 1]}, {c.Fecha.Year}";
        
        // Format Hora: "09:00 AM"
        var horaFormatted = DateTime.Today.Add(c.HoraInicio).ToString("hh:mm tt", CultureInfo.InvariantCulture);

        return new ClassSessionDto
        {
            IdClass = c.IdClass,
            Nombre = c.Nombre,
            Fecha = fechaFormatted,
            Hora = horaFormatted,
            CapacidadMaxima = c.CapacidadMaxima,
            Inscritos = c.Enrollments?.Count ?? 0,
            Estado = c.Estado,
            Entrenador = new EntrenadorBasicoDto
            {
                IdEmpleado = c.Entrenador.IdEmpleado,
                NombreCompleto = $"{c.Entrenador.Profile.Nombre} {c.Entrenador.Profile.Apellidos}"
            },
            Inscrito = currentClientId.HasValue && (c.Enrollments?.Any(e => e.IdCliente == currentClientId.Value) ?? false)
        };
    }
}
