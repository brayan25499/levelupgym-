using System.Globalization;
using System.Security.Claims;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.DTOs;
using LevelUpGym.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using LevelUpGym.Api.Services;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProgressController : ControllerBase
{
    private readonly LevelUpDbContext _context;
    private readonly IGoalEvaluationService _goalEvaluationService;

    public ProgressController(LevelUpDbContext context, IGoalEvaluationService goalEvaluationService)
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

        // If client record doesn't exist yet, auto-create it
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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProgressDto>>> GetMyProgressHistory()
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized("Cliente no encontrado.");

        var reports = await _context.ProgressReports
            .Where(p => p.IdCliente == client.IdCliente && p.DeletedAt == null)
            .OrderBy(p => p.FechaMedicion)
            .ThenBy(p => p.CreatedAt)
            .Select(p => new ProgressDto
            {
                IdProgreso = p.IdProgreso,
                IdCliente = p.IdCliente,
                Peso = p.Peso,
                Altura = p.Altura,
                Imc = p.Imc,
                Cintura = p.Cintura,
                Pecho = p.Pecho,
                Brazo = p.Brazo,
                Pierna = p.Pierna,
                FechaMedicion = p.FechaMedicion,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return Ok(reports);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProgressDto>> GetProgressById(int id)
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized("Cliente no encontrado.");

        var p = await _context.ProgressReports
            .FirstOrDefaultAsync(pr => pr.IdProgreso == id && pr.IdCliente == client.IdCliente && pr.DeletedAt == null);

        if (p == null) return NotFound("Medición no encontrada.");

        return Ok(new ProgressDto
        {
            IdProgreso = p.IdProgreso,
            IdCliente = p.IdCliente,
            Peso = p.Peso,
            Altura = p.Altura,
            Imc = p.Imc,
            Cintura = p.Cintura,
            Pecho = p.Pecho,
            Brazo = p.Brazo,
            Pierna = p.Pierna,
            FechaMedicion = p.FechaMedicion,
            CreatedAt = p.CreatedAt
        });
    }

    [HttpPost]
    public async Task<ActionResult<ProgressDto>> CreateProgress([FromBody] CreateProgressDto dto)
    {
        try
        {
            var client = await GetCurrentClientAsync();
            if (client == null) return Unauthorized(new { message = "Cliente no encontrado." });

            var valError = ValidateProgressData(dto.Peso, dto.Altura, dto.Cintura, dto.Pecho, dto.Brazo, dto.Pierna, dto.FechaMedicion);
            if (valError != null)
            {
                return BadRequest(new { message = valError });
            }

            // Convert height to meters if provided in cm (> 3)
            decimal alturaM = dto.Altura > 3 ? dto.Altura / 100m : dto.Altura;

            // Formula: IMC = Peso / (Altura * Altura) rounded to max 2 decimals
            decimal rawImc = dto.Peso / (alturaM * alturaM);
            decimal roundedImc = Math.Round(rawImc, 2);

            var progress = new Progress
            {
                IdCliente     = client.IdCliente,
                Peso          = dto.Peso,
                Altura        = alturaM.ToString("F2", CultureInfo.InvariantCulture),
                Imc           = roundedImc.ToString("F2", CultureInfo.InvariantCulture),
                Cintura       = dto.Cintura,
                Pecho         = dto.Pecho,
                Brazo         = dto.Brazo,
                Pierna        = dto.Pierna,
                FechaMedicion = dto.FechaMedicion ?? DateOnly.FromDateTime(DateTime.UtcNow),
                CreatedAt     = DateTime.UtcNow
            };

            _context.ProgressReports.Add(progress);

            // Synchronize client profile weight & height
            var profile = await _context.Profiles.FirstOrDefaultAsync(pr => pr.IdProfile == client.IdProfile);
            if (profile != null)
            {
                profile.Peso = dto.Peso;
                profile.Estatura = alturaM;
                profile.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            // Automatically evaluate client active goals after saving new measurement
            try
            {
                await _goalEvaluationService.EvaluateClientGoalsAsync(client.IdCliente);
            }
            catch (Exception exGoals)
            {
                Console.WriteLine("Warning evaluating goals: " + exGoals.Message);
            }

            var responseDto = new ProgressDto
            {
                IdProgreso = progress.IdProgreso,
                IdCliente = progress.IdCliente,
                Peso = progress.Peso,
                Altura = progress.Altura,
                Imc = progress.Imc,
                Cintura = progress.Cintura,
                Pecho = progress.Pecho,
                Brazo = progress.Brazo,
                Pierna = progress.Pierna,
                FechaMedicion = progress.FechaMedicion,
                CreatedAt = progress.CreatedAt
            };

            return CreatedAtAction(nameof(GetProgressById), new { id = progress.IdProgreso }, responseDto);
        }
        catch (Exception ex)
        {
            var fullMsg = ex.InnerException != null ? $"{ex.Message} --> {ex.InnerException.Message}" : ex.Message;
            return StatusCode(500, new { message = fullMsg });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProgress(int id, [FromBody] UpdateProgressDto dto)
    {
        try
        {
            var client = await GetCurrentClientAsync();
            if (client == null) return Unauthorized(new { message = "Cliente no encontrado." });

            var progress = await _context.ProgressReports
                .FirstOrDefaultAsync(pr => pr.IdProgreso == id && pr.IdCliente == client.IdCliente && pr.DeletedAt == null);

            if (progress == null) return NotFound(new { message = "Medición no encontrada." });

            var valError = ValidateProgressData(dto.Peso, dto.Altura, dto.Cintura, dto.Pecho, dto.Brazo, dto.Pierna, dto.FechaMedicion);
            if (valError != null)
            {
                return BadRequest(new { message = valError });
            }

            decimal alturaM = dto.Altura > 3 ? dto.Altura / 100m : dto.Altura;
            decimal rawImc = dto.Peso / (alturaM * alturaM);
            decimal roundedImc = Math.Round(rawImc, 2);

            progress.Peso = dto.Peso;
            progress.Altura = alturaM.ToString("F2", CultureInfo.InvariantCulture);
            progress.Imc = roundedImc.ToString("F2", CultureInfo.InvariantCulture);
            progress.Cintura = dto.Cintura;
            progress.Pecho = dto.Pecho;
            progress.Brazo = dto.Brazo;
            progress.Pierna = dto.Pierna;
            if (dto.FechaMedicion.HasValue) progress.FechaMedicion = dto.FechaMedicion.Value;
            progress.UpdatedAt = DateTime.UtcNow;

            _context.Entry(progress).State = EntityState.Modified;

            // Synchronize client profile weight & height if this is the latest measurement
            var latestReport = await _context.ProgressReports
                .Where(p => p.IdCliente == client.IdCliente && p.DeletedAt == null)
                .OrderByDescending(p => p.FechaMedicion)
                .ThenByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();

            if (latestReport == null || latestReport.IdProgreso == id)
            {
                var profile = await _context.Profiles.FirstOrDefaultAsync(pr => pr.IdProfile == client.IdProfile);
                if (profile != null)
                {
                    profile.Peso = dto.Peso;
                    profile.Estatura = alturaM;
                    profile.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            // Automatically evaluate client active goals after updating measurement
            try
            {
                await _goalEvaluationService.EvaluateClientGoalsAsync(client.IdCliente);
            }
            catch (Exception exGoals)
            {
                Console.WriteLine("Warning evaluating goals: " + exGoals.Message);
            }

            return Ok(new { message = "Medición actualizada exitosamente." });
        }
        catch (Exception ex)
        {
            var fullMsg = ex.InnerException != null ? $"{ex.Message} --> {ex.InnerException.Message}" : ex.Message;
            return StatusCode(500, new { message = fullMsg });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProgress(int id)
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized("Cliente no encontrado.");

        var progress = await _context.ProgressReports
            .FirstOrDefaultAsync(pr => pr.IdProgreso == id && pr.IdCliente == client.IdCliente && pr.DeletedAt == null);

        if (progress == null) return NotFound("Medición no encontrada.");

        progress.DeletedAt = DateTime.UtcNow;
        _context.Entry(progress).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Medición eliminada exitosamente." });
    }

    private static string? ValidateProgressData(decimal peso, decimal altura, decimal? cintura, decimal? pecho, decimal? brazo, decimal? pierna, DateOnly? fechaMedicion)
    {
        if (peso <= 0 || peso > 500)
        {
            return "El peso debe ser un valor válido mayor a 0 kg y menor a 500 kg.";
        }

        if (altura <= 0 || altura > 300)
        {
            return "La estatura debe ser un valor válido mayor a 0 (ej. 1.75 m o 175 cm).";
        }

        if ((cintura.HasValue && cintura.Value < 0) ||
            (pecho.HasValue && pecho.Value < 0) ||
            (brazo.HasValue && brazo.Value < 0) ||
            (pierna.HasValue && pierna.Value < 0))
        {
            return "Las medidas corporales no pueden ser números negativos.";
        }

        if (fechaMedicion.HasValue && fechaMedicion.Value > DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)))
        {
            return "La fecha de medición no puede ser una fecha futura.";
        }

        return null;
    }
}
