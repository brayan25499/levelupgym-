using LevelUpGym.Api.DTOs;
using LevelUpGym.Api.Models;

namespace LevelUpGym.Api.Services;

public interface IPaymentGatewayService
{
    /// <summary>
    /// Genera la firma de integridad SHA-256 para transacciones seguras con la pasarela.
    /// </summary>
    string GenerateIntegritySignature(string reference, decimal amountInCents, string currency);

    /// <summary>
    /// Valida la firma del Webhook recibido de la pasarela para verificar su autenticidad.
    /// </summary>
    bool VerifyWebhookSignature(string reference, decimal amountInCents, string status, string signature);

    /// <summary>
    /// Crea una sesión de pago segura preparada para redirigir al checkout del proveedor (PSE/Tarjeta).
    /// </summary>
    PaymentSessionResponseDto CreatePaymentSession(Client client, Membership membership, decimal amountToPay, string paymentMethod, string referenceId, bool isUpgrade);
}
