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

        return await ProcessPaymentInternal(client, membership, "EFECTIVO", null, null, null, null);
    }

    [Authorize]
    [HttpGet("calculate-upgrade/{newPlanId}")]
    public async Task<IActionResult> CalculateUpgrade(int newPlanId)
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized("Cliente no encontrado.");

        var targetMembership = await _context.Memberships.FindAsync(newPlanId);
        if (targetMembership == null) return NotFound(new { message = "El plan seleccionado no existe." });

        var activeStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "ACTIVO" || s.Concepto == "ACTIVA");
        int activeStatusId = activeStatus?.IdEstado ?? 1;

        var activeSub = await _context.Subscriptions
            .Include(s => s.Membership)
            .Include(s => s.Status)
            .Where(s => s.IdCliente == client.IdCliente && s.DeletedAt == null && (s.IdEstado == activeStatusId || (s.Status != null && (s.Status.Concepto == "ACTIVO" || s.Status.Concepto == "ACTIVA"))))
            .OrderByDescending(s => s.FechaFin)
            .ThenByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        decimal precioNuevoPlan = targetMembership.Precio ?? 0m;
        decimal valorPlanActual = activeSub?.Precio > 0 ? activeSub.Precio : (activeSub?.Membership?.Precio ?? 0m);
        string nombrePlanActual = activeSub?.Membership?.Nombre ?? "Sin plan activo";
        int? idPlanActual = activeSub?.Membership?.IdMembresia;

        if (idPlanActual.HasValue && idPlanActual.Value == targetMembership.IdMembresia)
        {
            return BadRequest(new { message = "Ya tienes este plan activo actualmente." });
        }

        if (activeSub != null)
        {
            var hoy = DateOnly.FromDateTime(DateTime.Now);
            int diasTranscurridos = hoy.DayNumber - activeSub.FechaInicio.DayNumber;
            if (diasTranscurridos > 10)
            {
                return BadRequest(new { 
                    message = $"Han transcurrido {diasTranscurridos} días desde que inició tu membresía actual ({activeSub.FechaInicio:dd/MM/yyyy}). Los cambios de plan pagando la diferencia solo están permitidos dentro de los primeros 10 días de vigencia. Debes esperar a que venza tu plan el {activeSub.FechaFin:dd/MM/yyyy} para adquirir uno nuevo.",
                    diasTranscurridos,
                    limiteDias = 10,
                    permiteCambio = false
                });
            }

            if (precioNuevoPlan <= valorPlanActual)
            {
                return BadRequest(new {
                    message = $"No es posible cambiar a un plan de menor o igual valor ({targetMembership.Nombre}: ${precioNuevoPlan:N0} COP vs Plan Actual: ${valorPlanActual:N0} COP). Durante los primeros 10 días solo puedes cambiar a un plan de mayor precio (Upgrade) pagando la diferencia. Para adquirir un plan de menor valor debes esperar a que venza tu plan actual el {activeSub.FechaFin:dd/MM/yyyy}.",
                    permiteCambio = false
                });
            }
        }

        decimal excedente = precioNuevoPlan - valorPlanActual;
        bool esUpgrade = true;

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
            permiteCambio = true,
            mensaje = $"Excedente calculado correctamente: ${excedente:N0} COP"
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

        return await ProcessPaymentInternal(client, targetMembership, "EFECTIVO", null, null, null, null);
    }

    [Authorize]
    [HttpPost("process-payment")]
    public async Task<IActionResult> ProcessPayment([FromBody] ProcessPaymentDto request)
    {
        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized(new { message = "Cliente no encontrado." });

        var targetMembership = await _context.Memberships.FindAsync(request.NewPlanId);
        if (targetMembership == null) return NotFound(new { message = "El plan de membresía seleccionado no existe." });

        return await ProcessPaymentInternal(client, targetMembership, request.PaymentMethod, request.BankName, request.CardLast4, request.ReferenceId, request.CardHolder);
    }

    private async Task<IActionResult> ProcessPaymentInternal(
        Client client,
        Membership targetMembership,
        string paymentMethod,
        string? bankName,
        string? cardLast4,
        string? referenceIdInput,
        string? cardHolder)
    {
        var activeStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "ACTIVO" || s.Concepto == "ACTIVA")
            ?? new SubscriptionStatus { Concepto = "ACTIVO" };

        var replacedStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "REEMPLAZADA")
            ?? new SubscriptionStatus { Concepto = "REEMPLAZADA" };

        var activeSub = await _context.Subscriptions
            .Include(s => s.Membership)
            .Include(s => s.Status)
            .Where(s => s.IdCliente == client.IdCliente && s.DeletedAt == null && (s.IdEstado == activeStatus.IdEstado || (s.Status != null && (s.Status.Concepto == "ACTIVO" || s.Status.Concepto == "ACTIVA"))))
            .OrderByDescending(s => s.FechaFin)
            .ThenByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        decimal precioNuevoPlan = targetMembership.Precio ?? 0m;
        decimal valorPlanActual = activeSub != null ? (activeSub.Precio > 0 ? activeSub.Precio : (activeSub.Membership?.Precio ?? 0m)) : 0m;

        if (activeSub != null)
        {
            var hoy = DateOnly.FromDateTime(DateTime.Now);
            int diasTranscurridos = hoy.DayNumber - activeSub.FechaInicio.DayNumber;
            if (diasTranscurridos > 10)
            {
                return BadRequest(new { 
                    message = $"No es posible realizar el cambio de membresía. Han transcurrido {diasTranscurridos} días desde el inicio de tu plan actual ({activeSub.FechaInicio:dd/MM/yyyy}). Los cambios de plan pagando la diferencia solo se permiten dentro de los primeros 10 días de la membresía. Por favor espera a que tu plan finalice el {activeSub.FechaFin:dd/MM/yyyy} para adquirir una nueva membresía." 
                });
            }

            if (precioNuevoPlan <= valorPlanActual)
            {
                return BadRequest(new {
                    message = $"No es posible cambiar a un plan de menor o igual valor ({targetMembership.Nombre}: ${precioNuevoPlan:N0} COP vs Plan Actual: ${valorPlanActual:N0} COP). Durante los primeros 10 días solo puedes cambiar a un plan de mayor precio (Upgrade) pagando la diferencia. Para adquirir un plan de menor valor debes esperar a que venza tu plan actual el {activeSub.FechaFin:dd/MM/yyyy}."
                });
            }
        }

        string? nombrePlanAnterior = activeSub?.Membership?.Nombre;
        bool esUpgrade = activeSub != null;

        decimal amountToPay = esUpgrade ? (precioNuevoPlan - valorPlanActual) : precioNuevoPlan;

        string refId = !string.IsNullOrWhiteSpace(referenceIdInput)
            ? referenceIdInput.Trim().ToUpperInvariant()
            : $"LEVELUP-2026-{Random.Shared.Next(100000, 999999)}";

        if (await _context.Pagos.AnyAsync(p => p.ReferenciaExterna == refId))
        {
            return BadRequest(new { message = $"La transacción con referencia {refId} ya fue procesada anteriormente." });
        }

        using var dbTransaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Crear Venta
            var venta = new Venta
            {
                IdCliente = client.IdCliente,
                TipoVenta = esUpgrade ? "CAMBIO_MEMBRESIA" : "NUEVA_MEMBRESIA",
                Subtotal = precioNuevoPlan,
                Descuento = esUpgrade ? valorPlanActual : 0m,
                Total = amountToPay,
                Estado = "PAGADA",
                CreatedAt = DateTime.UtcNow
            };
            _context.Ventas.Add(venta);
            await _context.SaveChangesAsync();

            // 2. Crear Detalle de Venta
            var detalle = new VentaDetalle
            {
                IdVenta = venta.IdVenta,
                IdMembresia = targetMembership.IdMembresia,
                Descripcion = esUpgrade
                    ? $"Excedente Cambio de Plan a {targetMembership.Nombre} (Abono plan previo: ${valorPlanActual:N0} COP)"
                    : $"Suscripción Plan {targetMembership.Nombre}",
                Cantidad = 1,
                PrecioUnitario = amountToPay,
                Descuento = 0m,
                Subtotal = amountToPay,
                CreatedAt = DateTime.UtcNow
            };
            _context.VentaDetalles.Add(detalle);

            // 3. Crear Pago
            string metodoPagoNormalizado = string.Equals(paymentMethod, "PSE", StringComparison.OrdinalIgnoreCase) ? "PSE" : (string.Equals(paymentMethod, "TARJETA", StringComparison.OrdinalIgnoreCase) ? "TARJETA" : "EFECTIVO");
            var pago = new Pago
            {
                IdVenta = venta.IdVenta,
                MetodoPago = metodoPagoNormalizado,
                Proveedor = bankName ?? (metodoPagoNormalizado == "PSE" ? "Banco PSE" : "Simulador LevelUp"),
                ReferenciaExterna = refId,
                Monto = amountToPay,
                Estado = "APROBADO",
                FechaPago = DateTime.UtcNow,
                Metadata = cardLast4 != null ? $"{{\"cardLast4\":\"{cardLast4}\",\"cardHolder\":\"{cardHolder}\"}}" : null,
                CreatedAt = DateTime.UtcNow
            };
            _context.Pagos.Add(pago);

            // 4. Desactivar suscripción anterior marcándola como REEMPLAZADA si existía
            if (activeSub != null)
            {
                activeSub.IdEstado = replacedStatus.IdEstado;
                activeSub.UpdatedAt = DateTime.UtcNow;
                _context.Entry(activeSub).State = EntityState.Modified;
            }

            // Desactivar cualquier otra suscripción activa suelta
            var otherActiveSubs = await _context.Subscriptions
                .Where(s => s.IdCliente == client.IdCliente && (activeSub == null || s.IdSuscripcion != activeSub.IdSuscripcion) && s.DeletedAt == null && s.IdEstado == activeStatus.IdEstado)
                .ToListAsync();

            foreach (var otherSub in otherActiveSubs)
            {
                otherSub.IdEstado = replacedStatus.IdEstado;
                otherSub.UpdatedAt = DateTime.UtcNow;
                _context.Entry(otherSub).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync(); // Guardar cambios de suscripción anterior para liberar el índice único filtrado

            // 5. Crear la NUEVA suscripción activa
            var newSub = new Subscription
            {
                IdCliente = client.IdCliente,
                IdMembresia = targetMembership.IdMembresia,
                IdEstado = activeStatus.IdEstado,
                IdVenta = venta.IdVenta,
                IdSuscripcionAnterior = activeSub?.IdSuscripcion,
                Precio = precioNuevoPlan,
                FechaInicio = DateOnly.FromDateTime(DateTime.Now),
                FechaFin = DateOnly.FromDateTime(DateTime.Now.AddMonths(1)),
                CreatedAt = DateTime.UtcNow
            };
            _context.Subscriptions.Add(newSub);
            await _context.SaveChangesAsync();

            // 6. Si fue cambio, crear auditoría en cambios_suscripcion
            if (activeSub != null)
            {
                var cambio = new CambioSuscripcion
                {
                    IdCliente = client.IdCliente,
                    IdSuscripcionAnterior = activeSub.IdSuscripcion,
                    IdSuscripcionNueva = newSub.IdSuscripcion,
                    IdVenta = venta.IdVenta,
                    PrecioAnterior = activeSub.Precio > 0 ? activeSub.Precio : (activeSub.Membership?.Precio ?? 0m),
                    PrecioNuevo = precioNuevoPlan,
                    CreditoAplicado = valorPlanActual,
                    ValorAdicional = amountToPay,
                    ValorDevuelto = 0m,
                    Motivo = $"Cambio de plan de {nombrePlanAnterior ?? "Plan anterior"} a {targetMembership.Nombre}",
                    CreatedAt = DateTime.UtcNow
                };
                _context.CambiosSuscripcion.Add(cambio);
            }

            // 7. Movimiento de Caja (CashMovement) para compatibilidad con reportes
            if (amountToPay > 0)
            {
                string metodoDetalle = metodoPagoNormalizado == "PSE"
                    ? $"PSE ({bankName ?? "Banco PSE"})"
                    : (metodoPagoNormalizado == "TARJETA" ? $"Tarjeta (••• {cardLast4 ?? "4242"})" : "Efectivo");

                var movement = new CashMovement
                {
                    Tipo = "INGRESO",
                    Monto = amountToPay,
                    Fecha = DateTime.UtcNow,
                    Descripcion = $"Pago APROBADO {metodoDetalle} Ref: {refId} - Plan: {targetMembership.Nombre} (Cliente ID: {client.IdCliente})"
                };
                _context.CashMovements.Add(movement);
            }

            await _context.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            return Ok(new PaymentResultDto
            {
                Status = "APPROVED",
                ReferenceId = refId,
                PlanName = targetMembership.Nombre ?? "Plan LevelUp",
                AmountPaid = amountToPay,
                PaymentMethod = paymentMethod == "PSE" ? "PSE" : (paymentMethod == "TARJETA" ? "Tarjeta de Crédito / Débito" : "Efectivo"),
                BankName = bankName,
                Message = esUpgrade
                    ? $"Cambio de plan a {targetMembership.Nombre} realizado con éxito. Excedente pagado: ${amountToPay:N0} COP"
                    : $"Suscripción al plan {targetMembership.Nombre} activada con éxito.",
                IsUpgrade = esUpgrade,
                PreviousPlanName = nombrePlanAnterior,
                ExpiresAt = newSub.FechaFin.ToString("yyyy-MM-dd")
            });
        }
        catch (Exception ex)
        {
            await dbTransaction.RollbackAsync();
            return StatusCode(500, new { message = "Error interno procesando la venta y suscripción.", detail = ex.Message });
        }
    }
}
