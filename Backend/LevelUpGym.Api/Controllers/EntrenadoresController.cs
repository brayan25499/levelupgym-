using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.DTOs;

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
            .Where(e => e.Estado == "Activo" && e.EmpleadoRoles.Any())
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
}
