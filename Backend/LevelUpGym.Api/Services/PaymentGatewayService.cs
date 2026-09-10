using System.Security.Cryptography;
using System.Text;
using LevelUpGym.Api.DTOs;
using LevelUpGym.Api.Models;

namespace LevelUpGym.Api.Services;

public class PaymentGatewayService : IPaymentGatewayService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentGatewayService> _logger;

    public PaymentGatewayService(IConfiguration configuration, ILogger<PaymentGatewayService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public string GenerateIntegritySignature(string reference, decimal amountInCents, string currency)
    {
        string integritySecret = _configuration["PaymentGateway:IntegritySecret"] ?? "test_integrity_secret_levelup_2026";
        string rawString = $"{reference}{amountInCents:0}{currency}{integritySecret}";

        using var sha256 = SHA256.Create();
        byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(rawString));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public bool VerifyWebhookSignature(string reference, decimal amountInCents, string status, string signature)
    {
        if (string.IsNullOrWhiteSpace(signature)) return false;

        string webhookSecret = _configuration["PaymentGateway:WebhookSecret"] ?? "test_webhook_secret_12345";
        string rawString = $"{reference}{amountInCents:0}{status}{webhookSecret}";

        using var sha256 = SHA256.Create();
        byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(rawString));
        string computedSignature = Convert.ToHexString(bytes).ToLowerInvariant();

        return string.Equals(computedSignature, signature, StringComparison.OrdinalIgnoreCase);
    }

    public PaymentSessionResponseDto CreatePaymentSession(
        Client client,
        Membership membership,
        decimal amountToPay,
        string paymentMethod,
        string referenceId,
        bool isUpgrade)
    {
        string publicKey = _configuration["PaymentGateway:PublicKey"] ?? "pub_test_levelup2026";
        string checkoutBaseUrl = _configuration["PaymentGateway:CheckoutUrl"] ?? "https://checkout.wompi.co/p/";
        decimal amountInCents = amountToPay * 100m;
        string currency = "COP";

        string signature = GenerateIntegritySignature(referenceId, amountInCents, currency);

        string checkoutUrl = $"{checkoutBaseUrl}?public-key={publicKey}&currency={currency}&amount-in-cents={amountInCents:0}&reference={referenceId}&signature:integrity={signature}";

        _logger.LogInformation("Sesión de pago creada para Cliente {ClientId}, Ref: {RefId}, Monto: {Amount} COP", client.IdCliente, referenceId, amountToPay);

        return new PaymentSessionResponseDto
        {
            ReferenceId = referenceId,
            Amount = amountToPay,
            Currency = currency,
            PublicKey = publicKey,
            Signature = signature,
            CheckoutUrl = checkoutUrl,
            Status = "PENDING",
            PlanName = membership.Nombre ?? "Plan LevelUp",
            IsUpgrade = isUpgrade
        };
    }
}
