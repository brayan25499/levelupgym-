using System.Globalization;
using System.Security.Claims;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.DTOs;
using LevelUpGym.Api.Models;
using LevelUpGym.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GoalsController : ControllerBase
{
    private readonly LevelUpDbContext _context;
    private readonly IGoalEvaluationService _goalEvaluationService;

    public GoalsController(LevelUpDbContext context, IGoalEvaluationService goalEvaluationService)
    {
        _context = context;
        _goalEvaluationService = goalEvaluationService;
    }

    private async Task<Client?> GetCurrentClientAsync()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email)) return null;

        var auth = await _context.Auths
            .Include(a => a.Profile)
                .ThenInclude(p => p.Client)
            .FirstOrDefaultAsync(a => a.Email == email);

        if (auth?.Profile == null) return null;

        if (auth.Profile.Client == null)
        {
            var newClient = new Client
            {
                IdProfile = auth.Profile.IdProfile,
                Estado = "ACTIVO",
                CreatedAt = DateTime.UtcNow
            };
            _context.Clients.Add(newClient);
            await _context.SaveChangesAsync();
            auth.Profile.Client = newClient;
        }

        return auth.Profile.Client;
    }

    [HttpGet("types")]
    public async Task<ActionResult<IEnumerable<GoalType>>> GetGoalTypes()
    {
        var types = await _context.GoalTypes
            .Where(gt => gt.Activo && gt.DeletedAt == null)
            .OrderBy(gt => gt.Nombre)
            .ThenBy(gt => gt.Direccion == "MAYOR" ? 0 : 1)
            .ToListAsync();

        return Ok(types);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GoalResponseDto>>> GetMyGoals()
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized("Cliente no encontrado.");

        // First evaluate goals against latest progress report
        await _goalEvaluationService.EvaluateClientGoalsAsync(client.IdCliente);

        var goals = await _context.Goals
            .Include(g => g.GoalType)
            .Where(g => g.IdCliente == client.IdCliente && g.DeletedAt == null)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();

        var reports = await _context.ProgressReports
            .Where(p => p.IdCliente == client.IdCliente && p.DeletedAt == null)
            .OrderBy(p => p.FechaMedicion)
            .ThenBy(p => p.CreatedAt)
            .ToListAsync();

        var result = new List<GoalResponseDto>();

        foreach (var g in goals)
        {
            var goalType = g.GoalType;
            if (goalType == null) continue;

            // First report at or after goal start date (or overall first)
            var initialReport = reports.FirstOrDefault(r => r.FechaMedicion >= g.FechaInicio) ?? reports.FirstOrDefault();
            var latestReport = reports.LastOrDefault();

            decimal? valorInicial = initialReport != null ? GetMetricValue(initialReport, goalType.Nombre) : null;
            decimal? valorActual = latestReport != null ? GetMetricValue(latestReport, goalType.Nombre) : valorInicial;

            double porcentaje = CalculateProgressPercentage(g.Estado, goalType.Direccion, g.ValorMeta, valorInicial, valorActual);

            result.Add(new GoalResponseDto
            {
                IdObjetivo = g.IdObjetivo,
                IdCliente = g.IdCliente,
                IdTipoObjetivo = g.IdTipoObjetivo,
                NombreTipoObjetivo = goalType.Nombre,
                Unidad = goalType.Unidad,
                Direccion = goalType.Direccion,
                ValorMeta = g.ValorMeta,
                ValorInicial = valorInicial,
                ValorActual = valorActual,
                PorcentajeProgreso = porcentaje,
                FechaInicio = g.FechaInicio,
                FechaLimite = g.FechaLimite,
                Estado = g.Estado,
                Descripcion = g.Descripcion,
                CreatedAt = g.CreatedAt
            });
        }

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<GoalResponseDto>> CreateGoal([FromBody] CreateGoalDto dto)
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized("Cliente no encontrado.");

        if (dto.ValorMeta <= 0)
        {
            return BadRequest(new { message = "El valor meta debe ser mayor a 0." });
        }

        var goalType = await _context.GoalTypes.FirstOrDefaultAsync(gt => gt.IdTipoObjetivo == dto.IdTipoObjetivo && gt.Activo && gt.DeletedAt == null);
        if (goalType == null)
        {
            return BadRequest(new { message = "El tipo de objetivo no existe o se encuentra inactivo." });
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (dto.FechaLimite.HasValue && dto.FechaLimite.Value < today)
        {
            return BadRequest(new { message = "La fecha límite no puede ser anterior a la fecha actual de inicio." });
        }

        // Prevent duplicate active goal of the same type for the same client
        bool hasActiveDuplicate = await _context.Goals.AnyAsync(g => g.IdCliente == client.IdCliente && g.IdTipoObjetivo == dto.IdTipoObjetivo && g.Estado == "EN_PROGRESO" && g.DeletedAt == null);
        if (hasActiveDuplicate)
        {
            return BadRequest(new { message = $"Ya tienes un objetivo activo para '{goalType.Nombre}'. Completa o cancela el objetivo actual antes de crear uno nuevo." });
        }

        var newGoal = new Goal
        {
            IdCliente = client.IdCliente,
            IdTipoObjetivo = dto.IdTipoObjetivo,
            ValorMeta = dto.ValorMeta,
            FechaInicio = DateOnly.FromDateTime(DateTime.UtcNow),
            FechaLimite = dto.FechaLimite,
            Estado = "EN_PROGRESO",
            Descripcion = dto.Descripcion,
            CreatedAt = DateTime.UtcNow
        };

        _context.Goals.Add(newGoal);
        await _context.SaveChangesAsync();

        // Evaluate immediately
        await _goalEvaluationService.EvaluateClientGoalsAsync(client.IdCliente);

        // Fetch created with fresh status
        newGoal = await _context.Goals
            .Include(g => g.GoalType)
            .FirstOrDefaultAsync(g => g.IdObjetivo == newGoal.IdObjetivo) ?? newGoal;

        var reports = await _context.ProgressReports
            .Where(p => p.IdCliente == client.IdCliente && p.DeletedAt == null)
            .OrderBy(p => p.FechaMedicion)
            .ThenBy(p => p.CreatedAt)
            .ToListAsync();

        var initialReport = reports.FirstOrDefault(r => r.FechaMedicion >= newGoal.FechaInicio) ?? reports.FirstOrDefault();
        var latestReport = reports.LastOrDefault();

        decimal? valorInicial = initialReport != null ? GetMetricValue(initialReport, goalType.Nombre) : null;
        decimal? valorActual = latestReport != null ? GetMetricValue(latestReport, goalType.Nombre) : valorInicial;

        double porcentaje = CalculateProgressPercentage(newGoal.Estado, goalType.Direccion, newGoal.ValorMeta, valorInicial, valorActual);

        var responseDto = new GoalResponseDto
        {
            IdObjetivo = newGoal.IdObjetivo,
            IdCliente = newGoal.IdCliente,
            IdTipoObjetivo = newGoal.IdTipoObjetivo,
            NombreTipoObjetivo = goalType.Nombre,
            Unidad = goalType.Unidad,
            Direccion = goalType.Direccion,
            ValorMeta = newGoal.ValorMeta,
            ValorInicial = valorInicial,
            ValorActual = valorActual,
            PorcentajeProgreso = porcentaje,
            FechaInicio = newGoal.FechaInicio,
            FechaLimite = newGoal.FechaLimite,
            Estado = newGoal.Estado,
            Descripcion = newGoal.Descripcion,
            CreatedAt = newGoal.CreatedAt
        };

        return Ok(responseDto);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGoal(int id)
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized("Cliente no encontrado.");

        var goal = await _context.Goals.FirstOrDefaultAsync(g => g.IdObjetivo == id && g.IdCliente == client.IdCliente && g.DeletedAt == null);
        if (goal == null) return NotFound("Objetivo no encontrado.");

        goal.DeletedAt = DateTime.UtcNow;
        goal.Estado = "CANCELADO";
        _context.Entry(goal).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Objetivo eliminado exitosamente." });
    }

    private static decimal? GetMetricValue(Progress progress, string goalTypeName)
    {
        if (string.IsNullOrWhiteSpace(goalTypeName)) return null;

        string normalized = goalTypeName.Trim().ToLowerInvariant();

        switch (normalized)
        {
            case "peso":
                return progress.Peso;

            case "imc":
                if (!string.IsNullOrEmpty(progress.Imc) && decimal.TryParse(progress.Imc, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal imcVal))
                {
                    return imcVal;
                }
                return null;

            case "cintura":
                return progress.Cintura;

            case "pecho":
                return progress.Pecho;

            case "brazo":
                return progress.Brazo;

            case "pierna":
                return progress.Pierna;

            default:
                return null;
        }
    }

    private static double CalculateProgressPercentage(string estado, string direccion, decimal valorMeta, decimal? valorInicial, decimal? valorActual)
    {
        if (estado == "COMPLETADO") return 100.0;
        if (!valorInicial.HasValue || !valorActual.HasValue) return 0.0;

        double vi = (double)valorInicial.Value;
        double va = (double)valorActual.Value;
        double vm = (double)valorMeta;
        double pct = 0.0;

        string dir = (direccion ?? "MENOR").ToUpperInvariant();

        if (dir == "MENOR")
        {
            double totalDist = vi - vm;
            double actualDist = vi - va;
            if (totalDist <= 0)
            {
                pct = va <= vm ? 100.0 : 0.0;
            }
            else
            {
                pct = (actualDist / totalDist) * 100.0;
            }
        }
        else // MAYOR
        {
            double totalDist = vm - vi;
            double actualDist = va - vi;
            if (totalDist <= 0)
            {
                pct = va >= vm ? 100.0 : 0.0;
            }
            else
            {
                pct = (actualDist / totalDist) * 100.0;
            }
        }

        pct = Math.Max(0.0, Math.Min(100.0, pct));
        return Math.Round(pct, 1);
    }
}
