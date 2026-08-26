using System.Globalization;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LevelUpGym.Api.Services;

public interface IGoalEvaluationService
{
    Task EvaluateClientGoalsAsync(int idCliente);
}

public class GoalEvaluationService : IGoalEvaluationService
{
    private readonly LevelUpDbContext _context;

    public GoalEvaluationService(LevelUpDbContext context)
    {
        _context = context;
    }

    public async Task EvaluateClientGoalsAsync(int idCliente)
    {
        // 1. Get all active goals for client
        var activeGoals = await _context.Goals
            .Include(g => g.GoalType)
            .Where(g => g.IdCliente == idCliente && g.Estado == "EN_PROGRESO" && g.DeletedAt == null)
            .ToListAsync();

        if (!activeGoals.Any()) return;

        // 2. Get latest progress report for client
        var latestProgress = await _context.ProgressReports
            .Where(p => p.IdCliente == idCliente && p.DeletedAt == null)
            .OrderByDescending(p => p.FechaMedicion)
            .ThenByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        if (latestProgress == null) return;

        bool updated = false;

        foreach (var goal in activeGoals)
        {
            if (goal.GoalType == null || !goal.GoalType.Activo) continue;

            decimal? currentValue = GetMetricValue(latestProgress, goal.GoalType.Nombre);
            if (!currentValue.HasValue) continue;

            bool isCompleted = false;
            string direction = goal.GoalType.Direccion?.ToUpperInvariant() ?? "MENOR";

            if (direction == "MENOR")
            {
                isCompleted = currentValue.Value <= goal.ValorMeta;
            }
            else if (direction == "MAYOR")
            {
                isCompleted = currentValue.Value >= goal.ValorMeta;
            }

            if (isCompleted)
            {
                goal.Estado = "COMPLETADO";
                goal.UpdatedAt = DateTime.UtcNow;
                _context.Entry(goal).State = EntityState.Modified;
                updated = true;
            }
        }

        if (updated)
        {
            await _context.SaveChangesAsync();
        }
    }

    private decimal? GetMetricValue(Progress progress, string goalTypeName)
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

            case "porcentaje de grasa":
            case "porcentaje grasa":
            case "grasa":
                return progress.PorcentajeGrasa;

            default:
                return null;
        }
    }
}
