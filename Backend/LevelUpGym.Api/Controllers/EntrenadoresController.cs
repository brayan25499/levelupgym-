using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.DTOs;
using LevelUpGym.Api.Models;
using Microsoft.AspNetCore.Authorization;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EntrenadoresController : ControllerBase
{
    private readonly LevelUpDbContext _context;

    public EntrenadoresController(LevelUpDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET /api/entrenadores — Endpoint público (sin auth).
    /// Retorna los entrenadores activos con sus roles funcionales del gimnasio.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<EntrenadorDto>>> GetEntrenadores()
    {
        var entrenadores = await _context.Employees
            .Include(e => e.Profile)
            .Include(e => e.EmpleadoRoles)
                .ThenInclude(er => er.RolGimnasio)
            .Where(e => e.Estado == "Activo" && e.EmpleadoRoles.Any() && e.DeletedAt == null)
            .OrderBy(e => e.IdEmpleado)
            .Select(e => new EntrenadorDto
            {
                IdEmpleado = e.IdEmpleado,
                Nombre = e.Profile.Nombre,
                Apellidos = e.Profile.Apellidos,
                Iniciales = (e.Profile.Nombre.Substring(0, 1) + e.Profile.Apellidos.Substring(0, 1)).ToUpper(),
                Especialidad = e.Especialidad,
                Descripcion = e.Descripcion,
                Roles = e.EmpleadoRoles
                    .Where(er => er.RolGimnasio != null)
                    .Select(er => er.RolGimnasio.Nombre)
                    .ToList()
            })
            .ToListAsync();

        return Ok(entrenadores);
    }

    /// <summary>
    /// GET /api/entrenadores/admin — Endpoint administrativo (con auth).
    /// Retorna todos los entrenadores no eliminados con su información administrativa.
    /// </summary>
    [Authorize]
    [HttpGet("admin")]
    public async Task<ActionResult<List<EntrenadorAdminDto>>> GetEntrenadoresAdmin()
    {
        var entrenadores = await _context.Employees
            .Include(e => e.Profile)
            .Where(e => e.DeletedAt == null)
            .OrderBy(e => e.IdEmpleado)
            .Select(e => new EntrenadorAdminDto
            {
                IdEmpleado = e.IdEmpleado,
                Nombre = e.Profile.Nombre,
                Apellidos = e.Profile.Apellidos,
                Especialidad = e.Especialidad,
                Descripcion = e.Descripcion,
                SalarioBase = e.SalarioBase,
                FechaContratacion = e.FechaContratacion.HasValue ? e.FechaContratacion.Value.ToString("yyyy-MM-dd") : null,
                Estado = e.Estado
            })
            .ToListAsync();

        return Ok(entrenadores);
    }

    /// <summary>
    /// GET /api/entrenadores/{id} — Endpoint administrativo (con auth).
    /// Retorna un entrenador por su ID.
    /// </summary>
    [Authorize]
    [HttpGet("{id}")]
    public async Task<ActionResult<EntrenadorAdminDto>> GetEntrenador(int id)
    {
        var e = await _context.Employees
            .Include(x => x.Profile)
            .FirstOrDefaultAsync(x => x.IdEmpleado == id && x.DeletedAt == null);

        if (e == null)
        {
            return NotFound("Entrenador no encontrado.");
        }

        var dto = new EntrenadorAdminDto
        {
            IdEmpleado = e.IdEmpleado,
            Nombre = e.Profile.Nombre,
            Apellidos = e.Profile.Apellidos,
            Especialidad = e.Especialidad,
            Descripcion = e.Descripcion,
            SalarioBase = e.SalarioBase,
            FechaContratacion = e.FechaContratacion.HasValue ? e.FechaContratacion.Value.ToString("yyyy-MM-dd") : null,
            Estado = e.Estado
        };

        return Ok(dto);
    }

    /// <summary>
    /// POST /api/entrenadores — Endpoint administrativo (con auth).
    /// Crea un nuevo entrenador.
    /// </summary>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<EntrenadorAdminDto>> CreateEntrenador(CreateEntrenadorDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest("El nombre es obligatorio.");

        if (string.IsNullOrWhiteSpace(request.Apellidos))
            return BadRequest("Los apellidos son obligatorios.");

        if (request.SalarioBase.HasValue && request.SalarioBase < 0)
            return BadRequest("El salario base no puede ser negativo.");

        // Generar un número de documento único y válido
        var numDoc = new Random().Next(100000000, 999999999).ToString();
        while (await _context.Profiles.AnyAsync(p => p.NumDocumento == numDoc))
        {
            numDoc = new Random().Next(100000000, 999999999).ToString();
        }

        // Crear perfil
        var profile = new Profile
        {
            Nombre = request.Nombre.Trim(),
            Apellidos = request.Apellidos.Trim(),
            TipoDocumento = "CC",
            NumDocumento = numDoc,
            Sexo = "No especificado",
            CreatedAt = DateTime.UtcNow
        };
        _context.Profiles.Add(profile);
        await _context.SaveChangesAsync();

        // Parsear fecha
        DateOnly? fechaContratacion = null;
        if (!string.IsNullOrWhiteSpace(request.FechaContratacion))
        {
            if (DateOnly.TryParse(request.FechaContratacion, out var parsedDate))
            {
                fechaContratacion = parsedDate;
            }
        }

        // Crear empleado
        var employee = new Employee
        {
            IdProfile = profile.IdProfile,
            FechaContratacion = fechaContratacion,
            SalarioBase = request.SalarioBase,
            Estado = "Activo",
            Especialidad = request.Especialidad?.Trim(),
            Descripcion = request.Descripcion?.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        // Asignar un rol de gimnasio por defecto para que aparezca en el frontend
        var defaultRole = await _context.RolesGimnasio.FirstOrDefaultAsync();
        if (defaultRole != null)
        {
            var empRol = new EmpleadoRolGimnasio
            {
                IdEmpleado = employee.IdEmpleado,
                IdRolGym = defaultRole.IdRolGym,
                CreatedAt = DateTime.UtcNow
            };
            _context.EmpleadoRolesGimnasio.Add(empRol);
            await _context.SaveChangesAsync();
        }

        var responseDto = new EntrenadorAdminDto
        {
            IdEmpleado = employee.IdEmpleado,
            Nombre = profile.Nombre,
            Apellidos = profile.Apellidos,
            Especialidad = employee.Especialidad,
            Descripcion = employee.Descripcion,
            SalarioBase = employee.SalarioBase,
            FechaContratacion = employee.FechaContratacion.HasValue ? employee.FechaContratacion.Value.ToString("yyyy-MM-dd") : null,
            Estado = employee.Estado
        };

        return CreatedAtAction(nameof(GetEntrenador), new { id = employee.IdEmpleado }, responseDto);
    }

    /// <summary>
    /// PUT /api/entrenadores/{id} — Endpoint administrativo (con auth).
    /// Actualiza un entrenador existente.
    /// </summary>
    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEntrenador(int id, UpdateEntrenadorDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return BadRequest("El nombre es obligatorio.");

        if (string.IsNullOrWhiteSpace(request.Apellidos))
            return BadRequest("Los apellidos son obligatorios.");

        if (request.SalarioBase.HasValue && request.SalarioBase < 0)
            return BadRequest("El salario base no puede ser negativo.");

        var employee = await _context.Employees
            .Include(e => e.Profile)
            .FirstOrDefaultAsync(e => e.IdEmpleado == id && e.DeletedAt == null);

        if (employee == null)
        {
            return NotFound("Entrenador no encontrado.");
        }

        // Actualizar Profile
        employee.Profile.Nombre = request.Nombre.Trim();
        employee.Profile.Apellidos = request.Apellidos.Trim();
        employee.Profile.UpdatedAt = DateTime.UtcNow;

        // Parsear fecha
        DateOnly? fechaContratacion = null;
        if (!string.IsNullOrWhiteSpace(request.FechaContratacion))
        {
            if (DateOnly.TryParse(request.FechaContratacion, out var parsedDate))
            {
                fechaContratacion = parsedDate;
            }
        }

        // Actualizar Employee
        employee.Especialidad = request.Especialidad?.Trim();
        employee.Descripcion = request.Descripcion?.Trim();
        employee.SalarioBase = request.SalarioBase;
        employee.FechaContratacion = fechaContratacion;
        if (!string.IsNullOrWhiteSpace(request.Estado))
        {
            employee.Estado = request.Estado.Trim();
        }
        employee.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Entrenador actualizado correctamente." });
    }

    /// <summary>
    /// DELETE /api/entrenadores/{id} — Endpoint administrativo (con auth).
    /// Realiza un soft delete de un entrenador.
    /// </summary>
    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEntrenador(int id)
    {
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.IdEmpleado == id && e.DeletedAt == null);
        if (employee == null)
        {
            return NotFound("Entrenador no encontrado o ya ha sido eliminado.");
        }

        employee.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Entrenador eliminado correctamente." });
    }
}
