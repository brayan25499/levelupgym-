using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.DTOs;
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

    [Authorize]
    [HttpPost("purchase/{id}")]
    public async Task<IActionResult> PurchaseMembership(int id)
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized("Cliente no encontrado.");

        var membership = await _context.Memberships.FindAsync(id);
        if (membership == null) return NotFound(new { message = $"La membresía con ID {id} no existe." });

        var activeStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "ACTIVO")
            ?? new SubscriptionStatus { Concepto = "ACTIVO" };

        if (activeStatus.IdEstado == 0)
        {
            _context.SubscriptionStatuses.Add(activeStatus);
            await _context.SaveChangesAsync();
        }

        var activeSub = await _context.Subscriptions
            .Include(s => s.Membership)
            .Where(s => s.IdCliente == client.IdCliente && s.DeletedAt == null && (s.IdEstado == activeStatus.IdEstado || (s.Status != null && s.Status.Concepto == "ACTIVO")))
            .OrderByDescending(s => s.FechaFin)
            .FirstOrDefaultAsync();

        if (activeSub != null)
        {
            activeSub.IdMembresia = id;
            activeSub.IdEstado = activeStatus.IdEstado;
            activeSub.FechaFin = DateOnly.FromDateTime(DateTime.Now.AddMonths(1));
            activeSub.UpdatedAt = DateTime.UtcNow;
            _context.Entry(activeSub).State = EntityState.Modified;
        }
        else
        {
            activeSub = new Subscription
            {
                IdCliente = client.IdCliente,
                IdMembresia = id,
                IdEstado = activeStatus.IdEstado,
                FechaInicio = DateOnly.FromDateTime(DateTime.Now),
                FechaFin = DateOnly.FromDateTime(DateTime.Now.AddMonths(1)),
                CreatedAt = DateTime.UtcNow
            };
            _context.Subscriptions.Add(activeSub);
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Membresía activada con éxito", expiresAt = activeSub.FechaFin });
    }

    [Authorize]
    [HttpGet("calculate-upgrade/{newPlanId}")]
    public async Task<IActionResult> CalculateUpgrade(int newPlanId)
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized("Cliente no encontrado.");

        var targetMembership = await _context.Memberships.FindAsync(newPlanId);
        if (targetMembership == null) return NotFound(new { message = "El plan seleccionado no existe." });

        var activeStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "ACTIVO");
        int activeStatusId = activeStatus?.IdEstado ?? 1;

        var activeSub = await _context.Subscriptions
            .Include(s => s.Membership)
            .Include(s => s.Status)
            .Where(s => s.IdCliente == client.IdCliente && s.DeletedAt == null && (s.IdEstado == activeStatusId || (s.Status != null && s.Status.Concepto == "ACTIVO")))
            .OrderByDescending(s => s.FechaFin)
            .ThenByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        decimal precioNuevoPlan = targetMembership.Precio ?? 0m;
        decimal valorPlanActual = activeSub?.Membership?.Precio ?? 0m;
        string nombrePlanActual = activeSub?.Membership?.Nombre ?? "Sin plan activo";
        int? idPlanActual = activeSub?.Membership?.IdMembresia;

        if (idPlanActual.HasValue && idPlanActual.Value == targetMembership.IdMembresia)
        {
            return BadRequest(new { message = "Ya tienes este plan activo actualmente." });
        }

        decimal excedente = Math.Max(0m, precioNuevoPlan - valorPlanActual);
        bool esUpgrade = precioNuevoPlan > valorPlanActual;

        return Ok(new
        {
            idPlanActual,
            nombrePlanActual,
            valorPlanActual,
            idNuevoPlan = targetMembership.IdMembresia,
            nombreNuevoPlan = targetMembership.Nombre ?? "Plan",
            precioNuevoPlan,
            excedenteAPagar = excedente,
            esUpgrade,
            mensaje = excedente == 0m 
                ? "El plan seleccionado tiene un costo menor o igual al actual. No aplica excedente ni reembolso automático."
                : $"Excedente calculado correctamente: ${excedente:N0} COP"
        });
    }

    [Authorize]
    [HttpPost("upgrade/{newPlanId}")]
    public async Task<IActionResult> UpgradeMembership(int newPlanId)
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized("Cliente no encontrado.");

        var targetMembership = await _context.Memberships.FindAsync(newPlanId);
        if (targetMembership == null) return NotFound(new { message = "El plan de membresía seleccionado no existe." });

        var activeStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "ACTIVO")
            ?? new SubscriptionStatus { Concepto = "ACTIVO" };

        if (activeStatus.IdEstado == 0)
        {
            _context.SubscriptionStatuses.Add(activeStatus);
            await _context.SaveChangesAsync();
        }

        var activeSub = await _context.Subscriptions
            .Include(s => s.Membership)
            .Include(s => s.Status)
            .Where(s => s.IdCliente == client.IdCliente && s.DeletedAt == null && (s.IdEstado == activeStatus.IdEstado || (s.Status != null && s.Status.Concepto == "ACTIVO")))
            .OrderByDescending(s => s.FechaFin)
            .ThenByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        decimal precioNuevoPlan = targetMembership.Precio ?? 0m;
        decimal valorPlanActual = activeSub?.Membership?.Precio ?? 0m;
        decimal excedente = Math.Max(0m, precioNuevoPlan - valorPlanActual);

        if (activeSub != null)
        {
            // Upgrade existing active subscription record in SQL Server
            activeSub.IdMembresia = targetMembership.IdMembresia;
            activeSub.IdEstado = activeStatus.IdEstado;
            activeSub.FechaFin = DateOnly.FromDateTime(DateTime.Now.AddMonths(1));
            activeSub.UpdatedAt = DateTime.UtcNow;
            _context.Entry(activeSub).State = EntityState.Modified;
        }
        else
        {
            // Create new active subscription record
            activeSub = new Subscription
            {
                IdCliente = client.IdCliente,
                IdMembresia = targetMembership.IdMembresia,
                IdEstado = activeStatus.IdEstado,
                FechaInicio = DateOnly.FromDateTime(DateTime.Now),
                FechaFin = DateOnly.FromDateTime(DateTime.Now.AddMonths(1)),
                CreatedAt = DateTime.UtcNow
            };
            _context.Subscriptions.Add(activeSub);
        }

        // Deactivate any other duplicate subscriptions if present
        var duplicates = await _context.Subscriptions
            .Where(s => s.IdCliente == client.IdCliente && s.IdSuscripcion != activeSub.IdSuscripcion && s.DeletedAt == null)
            .ToListAsync();

        foreach (var dup in duplicates)
        {
            dup.DeletedAt = DateTime.UtcNow;
            _context.Entry(dup).State = EntityState.Modified;
        }

        // Record cash movement transaction for surplus payment
        if (excedente > 0)
        {
            var movement = new CashMovement
            {
                Tipo = "INGRESO",
                Monto = excedente,
                Fecha = DateTime.UtcNow,
                Descripcion = $"Pago de excedente por cambio a plan {targetMembership.Nombre} (Cliente ID {client.IdCliente})"
            };
            _context.CashMovements.Add(movement);
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Membresía actualizada con éxito.",
            nombreNuevoPlan = targetMembership.Nombre,
            excedentePagado = excedente,
            expiresAt = activeSub.FechaFin
        });
    }

    [Authorize]
    [HttpPost("process-payment")]
    public async Task<IActionResult> ProcessPayment([FromBody] ProcessPaymentDto request)
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized(new { message = "Cliente no encontrado." });

        var targetMembership = await _context.Memberships.FindAsync(request.NewPlanId);
        if (targetMembership == null) return NotFound(new { message = "El plan de membresía seleccionado no existe." });

        var activeStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "ACTIVO")
            ?? new SubscriptionStatus { Concepto = "ACTIVO" };

        if (activeStatus.IdEstado == 0)
        {
            _context.SubscriptionStatuses.Add(activeStatus);
            await _context.SaveChangesAsync();
        }

        var activeSub = await _context.Subscriptions
            .Include(s => s.Membership)
            .Include(s => s.Status)
            .Where(s => s.IdCliente == client.IdCliente && s.DeletedAt == null && (s.IdEstado == activeStatus.IdEstado || (s.Status != null && s.Status.Concepto == "ACTIVO")))
            .OrderByDescending(s => s.FechaFin)
            .ThenByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        decimal precioNuevoPlan = targetMembership.Precio ?? 0m;
        decimal valorPlanActual = activeSub?.Membership?.Precio ?? 0m;
        string? nombrePlanAnterior = activeSub?.Membership?.Nombre;
        bool esUpgrade = activeSub != null;

        decimal amountToPay = esUpgrade ? Math.Max(0m, precioNuevoPlan - valorPlanActual) : precioNuevoPlan;

        // Referencia única por transacción
        string refId = !string.IsNullOrWhiteSpace(request.ReferenceId)
            ? request.ReferenceId.Trim().ToUpperInvariant()
            : $"LEVELUP-2026-{Random.Shared.Next(100000, 999999)}";

        // Prevenir transacciones duplicadas
        if (await _context.CashMovements.AnyAsync(m => m.Descripcion != null && m.Descripcion.Contains(refId)))
        {
            return BadRequest(new { message = $"La transacción con referencia {refId} ya fue procesada anteriormente." });
        }

        // Actualizar / crear suscripción en SQL Server
        if (activeSub != null)
        {
            activeSub.IdMembresia = targetMembership.IdMembresia;
            activeSub.IdEstado = activeStatus.IdEstado;
            activeSub.FechaFin = DateOnly.FromDateTime(DateTime.Now.AddMonths(1));
            activeSub.UpdatedAt = DateTime.UtcNow;
            _context.Entry(activeSub).State = EntityState.Modified;
        }
        else
        {
            activeSub = new Subscription
            {
                IdCliente = client.IdCliente,
                IdMembresia = targetMembership.IdMembresia,
                IdEstado = activeStatus.IdEstado,
                FechaInicio = DateOnly.FromDateTime(DateTime.Now),
                FechaFin = DateOnly.FromDateTime(DateTime.Now.AddMonths(1)),
                CreatedAt = DateTime.UtcNow
            };
            _context.Subscriptions.Add(activeSub);
        }

        // Desactivar suscripciones duplicadas anteriores
        var duplicates = await _context.Subscriptions
            .Where(s => s.IdCliente == client.IdCliente && s.IdSuscripcion != activeSub.IdSuscripcion && s.DeletedAt == null)
            .ToListAsync();

        foreach (var dup in duplicates)
        {
            dup.DeletedAt = DateTime.UtcNow;
            _context.Entry(dup).State = EntityState.Modified;
        }

        // Registrar el movimiento de caja por la compra o pago de excedente aprobado
        string metodoDetalle = request.PaymentMethod == "PSE"
            ? $"PSE ({request.BankName ?? "Banco PSE"})"
            : $"Tarjeta Crédito/Débito (••• {request.CardLast4 ?? "4242"})";

        var movement = new CashMovement
        {
            Tipo = "INGRESO",
            Monto = amountToPay,
            Fecha = DateTime.UtcNow,
            Descripcion = $"Pago APROBADO {metodoDetalle} Ref: {refId} - Plan: {targetMembership.Nombre} (Cliente ID: {client.IdCliente})"
        };
        _context.CashMovements.Add(movement);

        await _context.SaveChangesAsync();

        return Ok(new PaymentResultDto
        {
            Status = "APPROVED",
            ReferenceId = refId,
            PlanName = targetMembership.Nombre ?? "Plan LevelUp",
            AmountPaid = amountToPay,
            PaymentMethod = request.PaymentMethod == "PSE" ? "PSE" : "Tarjeta de Crédito / Débito",
            BankName = request.BankName,
            Message = esUpgrade
                ? $"Cambio de plan a {targetMembership.Nombre} realizado con éxito. Excedente pagado: ${amountToPay:N0} COP"
                : $"Suscripción al plan {targetMembership.Nombre} activada con éxito.",
            IsUpgrade = esUpgrade,
            PreviousPlanName = nombrePlanAnterior,
            ExpiresAt = activeSub.FechaFin.ToString("yyyy-MM-dd")
        });
    }
}
