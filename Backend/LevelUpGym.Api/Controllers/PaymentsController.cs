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
public class PaymentsController : ControllerBase
{
    private readonly LevelUpDbContext _context;
    private readonly IPaymentGatewayService _gatewayService;
    private readonly IEmailService _emailService;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        LevelUpDbContext context,
        IPaymentGatewayService gatewayService,
        IEmailService emailService,
        ILogger<PaymentsController> logger)
    {
        _context = context;
        _gatewayService = gatewayService;
        _emailService = emailService;
        _logger = logger;
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

    /// <summary>
    /// Crea una sesión de pago asíncrona preparada para la pasarela (PSE / Tarjeta).
    /// Genera la Venta, Detalle, Pago y Suscripción en estado PENDIENTE.
    /// </summary>
    [Authorize]
    [HttpPost("create-session")]
    public async Task<IActionResult> CreatePaymentSession([FromBody] CreatePaymentSessionDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var client = await GetCurrentClientAsync();
        if (client == null) return Unauthorized(new { message = "Cliente no encontrado." });

        var targetMembership = await _context.Memberships.FindAsync(request.PlanId);
        if (targetMembership == null) return NotFound(new { message = "El plan de membresía seleccionado no existe." });

        var activeStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "ACTIVO" || s.Concepto == "ACTIVA")
            ?? new SubscriptionStatus { Concepto = "ACTIVO" };

        var pendingSubStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "PENDIENTE")
            ?? new SubscriptionStatus { Concepto = "PENDIENTE" };

        var activeSub = await _context.Subscriptions
            .Include(s => s.Membership)
            .Include(s => s.Status)
            .Where(s => s.IdCliente == client.IdCliente && s.DeletedAt == null && (s.IdEstado == activeStatus.IdEstado || (s.Status != null && (s.Status.Concepto == "ACTIVO" || s.Status.Concepto == "ACTIVA"))))
            .OrderByDescending(s => s.FechaFin)
            .ThenByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        decimal precioNuevoPlan = targetMembership.Precio ?? 0m;
        decimal valorPlanActual = activeSub != null ? (activeSub.Precio > 0 ? activeSub.Precio : (activeSub.Membership?.Precio ?? 0m)) : 0m;

        // Regla de Negocio: 10 días límite y solo hacia un plan de mayor precio (Upgrade)
        if (activeSub != null)
        {
            var hoy = DateOnly.FromDateTime(DateTime.Now);
            int diasTranscurridos = hoy.DayNumber - activeSub.FechaInicio.DayNumber;
            if (diasTranscurridos > 10)
            {
                return BadRequest(new
                {
                    message = $"No es posible realizar el cambio de membresía. Han transcurrido {diasTranscurridos} días desde el inicio de tu plan actual ({activeSub.FechaInicio:dd/MM/yyyy}). Los cambios de plan solo se permiten dentro de los primeros 10 días. Debes esperar a que venza el {activeSub.FechaFin:dd/MM/yyyy} para adquirir una nueva.",
                    diasTranscurridos,
                    limiteDias = 10,
                    permiteCambio = false
                });
            }

            if (activeSub.IdMembresia == targetMembership.IdMembresia)
            {
                return BadRequest(new { message = "Ya tienes este plan activo actualmente." });
            }

            if (precioNuevoPlan <= valorPlanActual)
            {
                return BadRequest(new
                {
                    message = $"No es posible cambiar a un plan de menor o igual valor ({targetMembership.Nombre}: ${precioNuevoPlan:N0} COP vs Plan Actual: ${valorPlanActual:N0} COP). Durante los primeros 10 días solo puedes cambiar a un plan de mayor precio (Upgrade) pagando la diferencia. Para adquirir un plan de menor valor debes esperar a que venza tu plan actual el {activeSub.FechaFin:dd/MM/yyyy}.",
                    permiteCambio = false
                });
            }
        }

        bool esUpgrade = activeSub != null;
        decimal amountToPay = esUpgrade ? (precioNuevoPlan - valorPlanActual) : precioNuevoPlan;

        string referenceId = $"LEVELUP-2026-{Random.Shared.Next(100000, 999999)}";

        using var dbTx = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Crear Venta en PENDIENTE
            var venta = new Venta
            {
                IdCliente = client.IdCliente,
                TipoVenta = esUpgrade ? "CAMBIO_MEMBRESIA" : "NUEVA_MEMBRESIA",
                Subtotal = precioNuevoPlan,
                Descuento = esUpgrade ? valorPlanActual : 0m,
                Total = amountToPay,
                Estado = "PENDIENTE",
                CreatedAt = DateTime.UtcNow
            };
            _context.Ventas.Add(venta);
            await _context.SaveChangesAsync();

            // 2. Crear VentaDetalle
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

            // 3. Crear Pago en PROCESANDO / PENDIENTE
            string proveedor = "Pasarela";
            string franquicia = "GENERAL";
            string last4 = "4242";

            if (request.PaymentMethod.ToUpper() == "PSE")
            {
                proveedor = !string.IsNullOrWhiteSpace(request.BankName) ? $"PSE - {request.BankName}" : "Pasarela PSE";
            }
            else if (request.PaymentMethod.ToUpper() == "TARJETA")
            {
                if (!string.IsNullOrWhiteSpace(request.CardNumber))
                {
                    var digits = new string(request.CardNumber.Where(char.IsDigit).ToArray());
                    if (digits.Length >= 4) last4 = digits[^4..];
                    if (digits.StartsWith("4")) franquicia = "VISA";
                    else if (digits.StartsWith("5")) franquicia = "MASTERCARD";
                    else if (digits.StartsWith("3")) franquicia = "AMEX";
                }
                proveedor = $"Tarjeta {franquicia}";
            }

            var metadataObj = new Dictionary<string, string>
            {
                ["modo"] = "SIMULACION",
                ["banco"] = request.PaymentMethod.ToUpper() == "PSE" ? (request.BankName?.ToLowerInvariant() ?? "general") : franquicia.ToLowerInvariant(),
                ["tipoFlujo"] = request.PaymentMethod.ToUpper(),
                ["ultimos4"] = last4,
                ["usuarioDemo"] = !string.IsNullOrWhiteSpace(request.CardHolder) ? request.CardHolder : "usuario.demo",
                ["resultadoAutenticacion"] = "PROCESANDO"
            };

            var pago = new Pago
            {
                IdVenta = venta.IdVenta,
                MetodoPago = request.PaymentMethod.ToUpper(),
                Proveedor = proveedor,
                ReferenciaExterna = referenceId,
                Monto = amountToPay,
                Estado = "PROCESANDO",
                Metadata = System.Text.Json.JsonSerializer.Serialize(metadataObj),
                CreatedAt = DateTime.UtcNow
            };
            _context.Pagos.Add(pago);

            // 4. Crear Suscripción en PENDIENTE
            var pendingSub = new Subscription
            {
                IdCliente = client.IdCliente,
                IdMembresia = targetMembership.IdMembresia,
                IdEstado = pendingSubStatus.IdEstado,
                IdVenta = venta.IdVenta,
                IdSuscripcionAnterior = activeSub?.IdSuscripcion,
                Precio = precioNuevoPlan,
                FechaInicio = DateOnly.FromDateTime(DateTime.Now),
                FechaFin = DateOnly.FromDateTime(DateTime.Now.AddMonths(1)),
                CreatedAt = DateTime.UtcNow
            };
            _context.Subscriptions.Add(pendingSub);

            await _context.SaveChangesAsync();
            await dbTx.CommitAsync();

            var sessionData = _gatewayService.CreatePaymentSession(client, targetMembership, amountToPay, request.PaymentMethod, referenceId, esUpgrade);
            return Ok(sessionData);
        }
        catch (Exception ex)
        {
            await dbTx.RollbackAsync();
            _logger.LogError(ex, "Error creando sesión de pago para cliente {ClientId}", client.IdCliente);
            return StatusCode(500, new { message = "Error al iniciar la sesión de pago.", detail = ex.Message });
        }
    }

    /// <summary>
    /// Consultar estado de una transacción para Polling desde el Frontend.
    /// </summary>
    [Authorize]
    [HttpGet("status/{referenceId}")]
    public async Task<IActionResult> GetPaymentStatus(string referenceId)
    {
        var pago = await _context.Pagos
            .Include(p => p.Venta)
                .ThenInclude(v => v.Detalles)
                    .ThenInclude(d => d.Membership)
            .FirstOrDefaultAsync(p => p.ReferenciaExterna == referenceId);

        if (pago == null)
        {
            return NotFound(new { message = $"No se encontró ninguna transacción con referencia {referenceId}" });
        }

        var detalle = pago.Venta?.Detalles?.FirstOrDefault();
        string planName = detalle?.Membership?.Nombre ?? "Plan";

        return Ok(new PaymentStatusResponseDto
        {
            ReferenceId = pago.ReferenciaExterna!,
            Status = pago.Estado,
            Amount = pago.Monto,
            PlanName = planName,
            PaymentMethod = pago.MetodoPago,
            PaymentDate = pago.FechaPago,
            Message = pago.Estado switch
            {
                "APROBADO" => "El pago fue aprobado exitosamente y tu membresía se encuentra activa.",
                "PROCESANDO" => "Tu pago se está procesando. Por favor espera a que la entidad bancaria confirme.",
                "RECHAZADO" => "El pago fue rechazado por la entidad bancaria.",
                "CANCELADO" => "La transacción fue cancelada.",
                _ => "Transacción en estado pendiente."
            }
        });
    }

    /// <summary>
    /// Webhook de Notificaciones Instantáneas de Pago (IPN).
    /// Recibe la confirmación asíncrona de la pasarela.
    /// </summary>
    [HttpPost("webhook")]
    public async Task<IActionResult> ReceiveWebhook([FromBody] PaymentWebhookDto payload)
    {
        if (payload?.Data?.Transaction == null)
        {
            return BadRequest(new { message = "Payload de webhook inválido." });
        }

        var tx = payload.Data.Transaction;
        _logger.LogInformation("Webhook recibido: Ref {Ref}, TxId {TxId}, Status {Status}", tx.Reference, tx.Id, tx.Status);

        var pago = await _context.Pagos
            .Include(p => p.Venta)
            .FirstOrDefaultAsync(p => p.ReferenciaExterna == tx.Reference);

        if (pago == null)
        {
            _logger.LogWarning("Webhook recibido para referencia inexistente: {Ref}", tx.Reference);
            return NotFound(new { message = "Referencia de pago no encontrada." });
        }

        // Idempotencia: Si el pago ya está en estado terminal, no volver a procesar
        if (pago.Estado == "APROBADO" || pago.Estado == "RECHAZADO" || pago.Estado == "CANCELADO" || pago.Estado == "REEMBOLSADO")
        {
            _logger.LogInformation("Webhook ignorado por idempotencia. Referencia {Ref} ya está en estado terminal {Estado}", tx.Reference, pago.Estado);
            return Ok(new { message = "Evento ya procesado previamente." });
        }

        // Validar Firma de Seguridad
        decimal amountInCents = tx.AmountInCents;
        if (!string.IsNullOrEmpty(payload.Signature))
        {
            bool isValid = _gatewayService.VerifyWebhookSignature(tx.Reference, amountInCents, tx.Status, payload.Signature);
            if (!isValid)
            {
                _logger.LogWarning("Firma de Webhook inválida para Referencia {Ref}", tx.Reference);
                return Unauthorized(new { message = "Firma de webhook no válida." });
            }
        }

        using var dbTx = await _context.Database.BeginTransactionAsync();
        try
        {
            var activeStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "ACTIVO" || s.Concepto == "ACTIVA")
                ?? await _context.SubscriptionStatuses.FirstOrDefaultAsync();

            var replacedStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "REEMPLAZADA")
                ?? await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "INACTIVO" || s.Concepto == "CANCELADO" || s.Concepto == "CANCELADA")
                ?? activeStatus;

            var cancelledStatus = await _context.SubscriptionStatuses.FirstOrDefaultAsync(s => s.Concepto == "CANCELADA" || s.Concepto == "CANCELADO")
                ?? replacedStatus;

            var pendingSub = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.IdVenta == pago.IdVenta);

            if (tx.Status == "APPROVED")
            {
                pago.Estado = "APROBADO";
                pago.FechaPago = DateTime.UtcNow;
                
                string bankNameClean = (pago.Proveedor ?? "").Replace("PSE - ", "").Trim().ToLowerInvariant();
                var approvedMetadata = new Dictionary<string, string>
                {
                    ["modo"] = "SIMULACION",
                    ["banco"] = !string.IsNullOrEmpty(bankNameClean) ? bankNameClean : "general",
                    ["tipoFlujo"] = pago.MetodoPago,
                    ["usuarioDemo"] = "usuario.demo",
                    ["resultadoAutenticacion"] = "APROBADO"
                };
                pago.Metadata = System.Text.Json.JsonSerializer.Serialize(approvedMetadata);

                if (pago.Venta != null)
                {
                    pago.Venta.Estado = "PAGADA";
                    pago.Venta.UpdatedAt = DateTime.UtcNow;
                }

                if (pendingSub != null)
                {
                    // Si había una suscripción previa del cliente, la deshabilitamos a REEMPLAZADA y registramos cambios_suscripcion
                    if (pendingSub.IdSuscripcionAnterior.HasValue)
                    {
                        var prevSub = await _context.Subscriptions
                            .Include(s => s.Membership)
                            .FirstOrDefaultAsync(s => s.IdSuscripcion == pendingSub.IdSuscripcionAnterior.Value);

                        if (prevSub != null)
                        {
                            prevSub.IdEstado = replacedStatus.IdEstado;
                            prevSub.UpdatedAt = DateTime.UtcNow;

                            var nuevoPlan = await _context.Memberships.FindAsync(pendingSub.IdMembresia);
                            decimal precioAnterior = prevSub.Precio > 0 ? prevSub.Precio : (prevSub.Membership?.Precio ?? 0m);

                            var cambioAudit = new CambioSuscripcion
                            {
                                IdCliente = pendingSub.IdCliente,
                                IdSuscripcionAnterior = prevSub.IdSuscripcion,
                                IdSuscripcionNueva = pendingSub.IdSuscripcion,
                                IdVenta = pago.IdVenta,
                                PrecioAnterior = precioAnterior,
                                PrecioNuevo = pendingSub.Precio,
                                CreditoAplicado = precioAnterior,
                                ValorAdicional = pago.Monto,
                                ValorDevuelto = 0m,
                                Motivo = $"Cambio de plan de {prevSub.Membership?.Nombre ?? "Plan Anterior"} a {nuevoPlan?.Nombre ?? "Nuevo Plan"} via {pago.Proveedor} (Ref: {pago.ReferenciaExterna})",
                                CreatedAt = DateTime.UtcNow
                            };
                            _context.CambiosSuscripcion.Add(cambioAudit);
                        }
                    }

                    // Marcar la nueva como ACTIVA
                    pendingSub.IdEstado = activeStatus.IdEstado;
                    pendingSub.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                // Registrar movimiento de caja
                _context.CashMovements.Add(new CashMovement
                {
                    Tipo = "INGRESO",
                    Monto = pago.Monto,
                    Fecha = DateTime.UtcNow,
                    Descripcion = $"Webhook APROBADO {pago.MetodoPago} Ref: {pago.ReferenciaExterna} (Venta ID {pago.IdVenta})"
                });

                await _context.SaveChangesAsync();
                await dbTx.CommitAsync();

                _logger.LogInformation("Pago {Ref} procesado como APROBADO exitosamente via Webhook", tx.Reference);
            }
            else if (tx.Status == "DECLINED" || tx.Status == "VOIDED" || tx.Status == "ERROR")
            {
                pago.Estado = "RECHAZADO";
                var declinedMetadata = new Dictionary<string, string>
                {
                    ["modo"] = "SIMULACION",
                    ["proveedor"] = pago.Proveedor ?? "Pasarela",
                    ["tipoFlujo"] = pago.MetodoPago,
                    ["usuarioDemo"] = "usuario.demo",
                    ["motivo"] = "FONDOS_INSUFICIENTES_O_RECHAZO_SIMULADO",
                    ["resultadoAutenticacion"] = "RECHAZADO"
                };
                pago.Metadata = System.Text.Json.JsonSerializer.Serialize(declinedMetadata);

                if (pago.Venta != null)
                {
                    pago.Venta.Estado = "CANCELADA";
                    pago.Venta.UpdatedAt = DateTime.UtcNow;
                }

                if (pendingSub != null)
                {
                    pendingSub.IdEstado = cancelledStatus.IdEstado;
                    pendingSub.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await dbTx.CommitAsync();

                _logger.LogInformation("Pago {Ref} procesado como RECHAZADO via Webhook", tx.Reference);
            }

            return Ok(new { message = "Webhook procesado correctamente." });
        }
        catch (Exception ex)
        {
            await dbTx.RollbackAsync();
            _logger.LogError(ex, "Error al procesar webhook para referencia {Ref}", tx.Reference);
            return StatusCode(500, new { message = "Error interno procesando webhook.", detail = ex.Message });
        }
    }
}
