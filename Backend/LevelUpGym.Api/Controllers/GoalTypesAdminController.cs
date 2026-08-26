using LevelUpGym.Api.Data;
using LevelUpGym.Api.DTOs;
using LevelUpGym.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/admin/goaltypes")]
[Authorize]
public class GoalTypesAdminController : ControllerBase
{
    private readonly LevelUpDbContext _context;

    public GoalTypesAdminController(LevelUpDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GoalType>>> GetAllGoalTypes()
    {
        var types = await _context.GoalTypes
            .Where(gt => gt.DeletedAt == null)
            .OrderBy(gt => gt.IdTipoObjetivo)
            .ToListAsync();

        return Ok(types);
    }

    [HttpPost]
    public async Task<ActionResult<GoalType>> CreateGoalType([FromBody] CreateGoalTypeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(dto.Unidad))
        {
            return BadRequest(new { message = "El nombre y la unidad son requeridos." });
        }

        string dir = (dto.Direccion ?? "MENOR").ToUpperInvariant();
        if (dir != "MENOR" && dir != "MAYOR")
        {
            return BadRequest(new { message = "La dirección debe ser 'MENOR' o 'MAYOR'." });
        }

        bool exists = await _context.GoalTypes.AnyAsync(gt => gt.Nombre.ToLower() == dto.Nombre.Trim().ToLower() && gt.DeletedAt == null);
        if (exists)
        {
            return BadRequest(new { message = "Ya existe un tipo de objetivo con este nombre." });
        }

        var newType = new GoalType
        {
            Nombre = dto.Nombre.Trim(),
            Descripcion = dto.Descripcion,
            Unidad = dto.Unidad.Trim(),
            TipoDato = string.IsNullOrWhiteSpace(dto.TipoDato) ? "DECIMAL" : dto.TipoDato.Trim().ToUpperInvariant(),
            Direccion = dir,
            Activo = dto.Activo,
            CreatedAt = DateTime.UtcNow
        };

        _context.GoalTypes.Add(newType);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAllGoalTypes), new { id = newType.IdTipoObjetivo }, newType);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateGoalType(int id, [FromBody] UpdateGoalTypeDto dto)
    {
        var goalType = await _context.GoalTypes.FirstOrDefaultAsync(gt => gt.IdTipoObjetivo == id && gt.DeletedAt == null);
        if (goalType == null) return NotFound(new { message = "Tipo de objetivo no encontrado." });

        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(dto.Unidad))
        {
            return BadRequest(new { message = "El nombre y la unidad son requeridos." });
        }

        string dir = (dto.Direccion ?? "MENOR").ToUpperInvariant();
        if (dir != "MENOR" && dir != "MAYOR")
        {
            return BadRequest(new { message = "La dirección debe ser 'MENOR' o 'MAYOR'." });
        }

        bool exists = await _context.GoalTypes.AnyAsync(gt => gt.IdTipoObjetivo != id && gt.Nombre.ToLower() == dto.Nombre.Trim().ToLower() && gt.DeletedAt == null);
        if (exists)
        {
            return BadRequest(new { message = "Ya existe otro tipo de objetivo con este nombre." });
        }

        goalType.Nombre = dto.Nombre.Trim();
        goalType.Descripcion = dto.Descripcion;
        goalType.Unidad = dto.Unidad.Trim();
        goalType.TipoDato = string.IsNullOrWhiteSpace(dto.TipoDato) ? "DECIMAL" : dto.TipoDato.Trim().ToUpperInvariant();
        goalType.Direccion = dir;
        goalType.Activo = dto.Activo;
        goalType.UpdatedAt = DateTime.UtcNow;

        _context.Entry(goalType).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tipo de objetivo actualizado exitosamente.", goalType });
    }

    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var goalType = await _context.GoalTypes.FirstOrDefaultAsync(gt => gt.IdTipoObjetivo == id && gt.DeletedAt == null);
        if (goalType == null) return NotFound(new { message = "Tipo de objetivo no encontrado." });

        goalType.Activo = !goalType.Activo;
        goalType.UpdatedAt = DateTime.UtcNow;
        _context.Entry(goalType).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Tipo de objetivo {(goalType.Activo ? "activado" : "desactivado")} exitosamente.", activo = goalType.Activo });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGoalType(int id)
    {
        var goalType = await _context.GoalTypes.FirstOrDefaultAsync(gt => gt.IdTipoObjetivo == id && gt.DeletedAt == null);
        if (goalType == null) return NotFound(new { message = "Tipo de objetivo no encontrado." });

        // Check if there are any associated goals
        bool hasGoals = await _context.Goals.AnyAsync(g => g.IdTipoObjetivo == id && g.DeletedAt == null);
        if (hasGoals)
        {
            return BadRequest(new { message = "No se puede eliminar un tipo de objetivo que ya tiene objetivos asociados en el sistema." });
        }

        goalType.DeletedAt = DateTime.UtcNow;
        goalType.Activo = false;
        _context.Entry(goalType).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tipo de objetivo eliminado exitosamente." });
    }
}
