using System.Net;
using System.Net.Mail;
using System.Text;

namespace LevelUpGym.Api.Services;

public class InvoiceEmailDto
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public string ClientName { get; set; } = string.Empty;
    public string ClientEmail { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public decimal PlanPrice { get; set; }
    public string MembershipPeriod { get; set; } = "Mensual";
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = "Tarjeta";
    public string Status { get; set; } = "PAGADO";
}

public interface IEmailService
{
    /// <summary>
    /// Envía el código de recuperación de contraseña al correo del usuario con el formato oficial LEVEL UP G.
    /// </summary>
    Task SendOtpEmail(string email, string? recipientName, string code);

    /// <summary>
    /// Genera y envía la factura electrónica de demostración al correo del usuario tras comprar/activar un plan.
    /// </summary>
    Task SendInvoiceEmail(InvoiceEmailDto invoice);
}

public class LevelUpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<LevelUpEmailService> _logger;

    public LevelUpEmailService(IConfiguration config, ILogger<LevelUpEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendOtpEmail(string email, string? recipientName, string code)
    {
        var name = string.IsNullOrWhiteSpace(recipientName) ? "Usuario" : recipientName.Trim();
        var subject = "Restablecimiento de contraseña - Level Up G";

        var htmlBody = $@"
<!DOCTYPE html>
<html lang=""es"">
<head>
    <meta charset=""UTF-8"">
    <title>Restablecimiento de contraseña - Level Up G</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f0f11; margin: 0; padding: 20px; color: #f0f0f0; }}
        .email-container {{ max-width: 540px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
        .header {{ background: linear-gradient(135deg, #18181b 0%, #27272a 100%); border-bottom: 2px solid #dc143c; padding: 24px; text-align: center; }}
        .brand {{ font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #ffffff; text-transform: uppercase; margin: 0; }}
        .brand span {{ color: #dc143c; }}
        .subtitle {{ font-size: 13px; color: #a1a1aa; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 5px; }}
        .content {{ padding: 30px 25px; line-height: 1.6; font-size: 15px; color: #d4d4d8; }}
        .greeting {{ font-size: 17px; font-weight: 600; color: #ffffff; margin-bottom: 15px; }}
        .code-box {{ background: #09090b; border: 1px dashed #dc143c; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }}
        .code-label {{ font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }}
        .otp-code {{ font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #dc143c; font-family: 'Courier New', monospace; }}
        .expiration-warning {{ font-size: 12px; color: #ef4444; margin-top: 8px; }}
        .disclaimer {{ font-size: 13px; color: #71717a; border-top: 1px solid #27272a; padding-top: 20px; margin-top: 25px; }}
        .footer {{ background: #09090b; padding: 20px; text-align: center; font-size: 12px; color: #71717a; }}
    </style>
</head>
<body>
    <div class=""email-container"">
        <div class=""header"">
            <h1 class=""brand"">LEVEL UP <span>G</span></h1>
            <div class=""subtitle"">Seguridad de la Cuenta</div>
        </div>
        <div class=""content"">
            <div class=""greeting"">Hola {WebUtility.HtmlEncode(name)},</div>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de <strong>Level Up G</strong>.</p>
            <p>Tu código de seguridad es:</p>
            
            <div class=""code-box"">
                <div class=""code-label"">Código de Verificación</div>
                <div class=""otp-code"">{code}</div>
                <div class=""expiration-warning"">⏳ Este código tiene una duración limitada de 5 minutos.</div>
            </div>

            <p>Introduce este código en la pantalla de recuperación para continuar con el cambio de tu contraseña.</p>
            
            <div class=""disclaimer"">
                Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña actual no se modificará.
            </div>
        </div>
        <div class=""footer"">
            &copy; {DateTime.UtcNow.Year} Level Up G. Todos los derechos reservados.
        </div>
    </div>
</body>
</html>";

        await SendEmailInternalAsync(email, subject, htmlBody, $"Código de recuperación: {code} para {email}");
    }

    public async Task SendInvoiceEmail(InvoiceEmailDto invoice)
    {
        var subject = $"Factura de Compra {invoice.InvoiceNumber} - Level Up G";
        var precioFormateado = $"${invoice.PlanPrice:N0} COP";
        var subtotalFormateado = $"${invoice.Subtotal:N0} COP";
        var totalFormateado = $"${invoice.Total:N0} COP";
        var descuentoFormateado = invoice.Discount > 0 ? $"-${invoice.Discount:N0} COP" : "$0 COP";

        var htmlBody = $@"
<!DOCTYPE html>
<html lang=""es"">
<head>
    <meta charset=""UTF-8"">
    <title>Factura de Compra - Level Up G</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #0c0c0e; margin: 0; padding: 25px; color: #f4f4f5; }}
        .invoice-card {{ max-width: 600px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 14px; overflow: hidden; box-shadow: 0 15px 30px rgba(0,0,0,0.6); }}
        .invoice-header {{ background: linear-gradient(135deg, #18181b 0%, #202024 100%); border-bottom: 3px solid #dc143c; padding: 28px; display: flex; justify-content: space-between; align-items: center; }}
        .brand {{ font-size: 28px; font-weight: 900; letter-spacing: 3px; color: #ffffff; text-transform: uppercase; margin: 0; }}
        .brand span {{ color: #dc143c; }}
        .badge-status {{ background: #064e3b; color: #34d399; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; padding: 6px 14px; border-radius: 20px; border: 1px solid #059669; text-transform: uppercase; }}
        .invoice-meta {{ padding: 24px 28px 10px; background: #131316; border-bottom: 1px solid #27272a; }}
        .title {{ font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: 1px; margin-bottom: 12px; text-transform: uppercase; }}
        .meta-grid {{ width: 100%; border-collapse: collapse; }}
        .meta-grid td {{ padding: 5px 0; font-size: 13.5px; }}
        .meta-label {{ color: #a1a1aa; width: 35%; }}
        .meta-val {{ color: #f4f4f5; font-weight: 600; }}
        .invoice-body {{ padding: 24px 28px; }}
        .items-table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
        .items-table th {{ background: #27272a; color: #d4d4d8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; padding: 10px 12px; text-align: left; }}
        .items-table th.text-right, .items-table td.text-right {{ text-align: right; }}
        .items-table td {{ padding: 14px 12px; border-bottom: 1px solid #27272a; font-size: 14px; }}
        .totals-section {{ margin-top: 20px; width: 100%; border-collapse: collapse; }}
        .totals-section td {{ padding: 6px 0; font-size: 14px; }}
        .totals-label {{ color: #a1a1aa; text-align: right; padding-right: 20px; }}
        .totals-val {{ text-align: right; font-weight: 600; width: 30%; color: #f4f4f5; }}
        .total-row td {{ font-size: 18px; font-weight: 800; color: #dc143c; border-top: 2px solid #27272a; padding-top: 12px; }}
        .thank-you {{ background: #111114; border: 1px solid #27272a; border-radius: 8px; padding: 18px; text-align: center; margin: 25px 28px; font-size: 14.5px; font-weight: 600; color: #e4e4e7; }}
        .thank-you span {{ color: #dc143c; }}
        .invoice-footer {{ background: #09090b; padding: 18px; text-align: center; font-size: 11.5px; color: #71717a; border-top: 1px solid #1f1f23; }}
    </style>
</head>
<body>
    <div class=""invoice-card"">
        <div class=""invoice-header"">
            <div>
                <div class=""brand"">LEVEL UP <span>G</span></div>
                <div style=""color: #a1a1aa; font-size: 12px; margin-top: 3px;"">FACTURA DE COMPRA</div>
            </div>
            <div>
                <span class=""badge-status"">ESTADO: {WebUtility.HtmlEncode(invoice.Status)}</span>
            </div>
        </div>

        <div class=""invoice-meta"">
            <table class=""meta-grid"">
                <tr>
                    <td class=""meta-label"">Factura:</td>
                    <td class=""meta-val"">{WebUtility.HtmlEncode(invoice.InvoiceNumber)}</td>
                </tr>
                <tr>
                    <td class=""meta-label"">Fecha de compra:</td>
                    <td class=""meta-val"">{invoice.PurchaseDate:dd/MM/yyyy HH:mm}</td>
                </tr>
                <tr>
                    <td class=""meta-label"">Cliente:</td>
                    <td class=""meta-val"">{WebUtility.HtmlEncode(invoice.ClientName)}</td>
                </tr>
                <tr>
                    <td class=""meta-label"">Correo:</td>
                    <td class=""meta-val"">{WebUtility.HtmlEncode(invoice.ClientEmail)}</td>
                </tr>
                <tr>
                    <td class=""meta-label"">Método de pago:</td>
                    <td class=""meta-val"">{WebUtility.HtmlEncode(invoice.PaymentMethod)}</td>
                </tr>
            </table>
        </div>

        <div class=""invoice-body"">
            <table class=""items-table"">
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Periodo</th>
                        <th class=""text-right"">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>Plan {WebUtility.HtmlEncode(invoice.PlanName)}</strong>
                            <div style=""font-size: 12px; color: #a1a1aa; margin-top: 3px;"">Acceso total a las instalaciones y servicios Level Up G</div>
                        </td>
                        <td>{WebUtility.HtmlEncode(invoice.MembershipPeriod)}</td>
                        <td class=""text-right font-weight-bold"">{precioFormateado}</td>
                    </tr>
                </tbody>
            </table>

            <table class=""totals-section"">
                <tr>
                    <td class=""totals-label"">Subtotal:</td>
                    <td class=""totals-val"">{subtotalFormateado}</td>
                </tr>";

        if (invoice.Discount > 0)
        {
            htmlBody += $@"
                <tr>
                    <td class=""totals-label"">Abono / Descuento:</td>
                    <td class=""totals-val"" style=""color: #34d399;"">{descuentoFormateado}</td>
                </tr>";
        }

        htmlBody += $@"
                <tr class=""total-row"">
                    <td class=""totals-label"">TOTAL:</td>
                    <td class=""totals-val"">{totalFormateado}</td>
                </tr>
            </table>
        </div>

        <div class=""thank-you"">
            ""Gracias por confiar en <span>LevelUp G</span>.""
        </div>

        <div class=""invoice-footer"">
            Comprobante académico emitido para LevelUp G &bull; Factura de demostración sin valor tributario fiscal.
        </div>
    </div>
</body>
</html>";

        await SendEmailInternalAsync(invoice.ClientEmail, subject, htmlBody, $"Factura {invoice.InvoiceNumber} generada para {invoice.ClientEmail} - Total: {totalFormateado}");
    }

    private async Task SendEmailInternalAsync(string toEmail, string subject, string htmlBody, string logSummary)
    {
        var smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST") ?? _config["Smtp:Host"];
        var smtpPortStr = Environment.GetEnvironmentVariable("SMTP_PORT") ?? _config["Smtp:Port"];
        var smtpUser = Environment.GetEnvironmentVariable("SMTP_USER") ?? _config["Smtp:User"];
        var smtpPass = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? _config["Smtp:Password"];
        var fromEmail = Environment.GetEnvironmentVariable("SMTP_FROM") ?? _config["Smtp:From"] ?? "noreply@levelupgym.com";
        var fromName = Environment.GetEnvironmentVariable("SMTP_FROM_NAME") ?? _config["Smtp:FromName"] ?? "LEVEL UP G";

        int smtpPort = 587;
        if (!string.IsNullOrWhiteSpace(smtpPortStr) && int.TryParse(smtpPortStr, out var parsedPort))
        {
            smtpPort = parsedPort;
        }

        // Si tenemos credenciales SMTP válidas, enviamos el correo real
        if (!string.IsNullOrWhiteSpace(smtpHost) && !string.IsNullOrWhiteSpace(smtpUser) && !string.IsNullOrWhiteSpace(smtpPass))
        {
            try
            {
                using var message = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true,
                    BodyEncoding = Encoding.UTF8,
                    SubjectEncoding = Encoding.UTF8
                };
                message.To.Add(new MailAddress(toEmail));

                using var smtpClient = new SmtpClient(smtpHost, smtpPort)
                {
                    UseDefaultCredentials = false, // CRÍTICO: debe ser false antes de asignar credenciales
                    Credentials = new NetworkCredential(smtpUser, smtpPass),
                    EnableSsl = true,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    Timeout = 20000 // 20 segundos
                };

                await smtpClient.SendMailAsync(message);
                _logger.LogInformation("Correo enviado exitosamente a {ToEmail}. Asunto: {Subject}", toEmail, subject);
                Console.WriteLine($"[EMAIL ENVIADO] {subject} -> {toEmail}");
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fallo al enviar correo SMTP a {ToEmail}. Procediendo con fallback de registro.", toEmail);
                Console.WriteLine($"[EMAIL FALLBACK] Falló el envío SMTP ({ex.Message}). Notificación registrada localmente.");
            }
        }

        // Fallback para modo demostración académica / desarrollo local
        Console.WriteLine("\n========================================================");
        Console.WriteLine($"[LEVEL UP G - NOTIFICACIÓN DE CORREO]");
        Console.WriteLine($"Para: {toEmail}");
        Console.WriteLine($"Asunto: {subject}");
        Console.WriteLine($"Detalle: {logSummary}");
        Console.WriteLine($"Fecha: {DateTime.Now:dd/MM/yyyy HH:mm:ss}");
        Console.WriteLine("========================================================\n");
    }
}
