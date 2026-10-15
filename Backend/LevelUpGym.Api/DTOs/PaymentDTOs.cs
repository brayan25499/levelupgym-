using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace LevelUpGym.Api.DTOs;

public class ProcessPaymentDto
{
    [Required(ErrorMessage = "El ID del nuevo plan es obligatorio.")]
    public int NewPlanId { get; set; }

    [Required(ErrorMessage = "El método de pago es obligatorio.")]
    [RegularExpression("^(PSE|TARJETA|EFECTIVO|TRANSFERENCIA)$", ErrorMessage = "Método de pago no válido.")]
    public string PaymentMethod { get; set; } = "PSE";

    public string? BankName { get; set; }
    public string? PersonType { get; set; } // "NATURAL" / "JURIDICA"
    public string? CardHolder { get; set; }
    public string? CardLast4 { get; set; }
    public string? ReferenceId { get; set; }
}

public class PaymentResultDto
{
    public string Status { get; set; } = "APPROVED"; // "APPROVED", "PENDING", "DECLINED", "CANCELLED"
    public string ReferenceId { get; set; } = null!;
    public string PlanName { get; set; } = null!;
    public decimal AmountPaid { get; set; }
    public string PaymentMethod { get; set; } = null!;
    public string? BankName { get; set; }
    public string Message { get; set; } = null!;
    public bool IsUpgrade { get; set; }
    public string? PreviousPlanName { get; set; }
    public string ExpiresAt { get; set; } = null!;
}

public class CreatePaymentSessionDto
{
    [Required(ErrorMessage = "El ID del plan es obligatorio.")]
    public int PlanId { get; set; }

    [Required(ErrorMessage = "El método de pago es obligatorio.")]
    [RegularExpression("^(PSE|TARJETA|TRANSFERENCIA)$", ErrorMessage = "Método de pago no válido.")]
    public string PaymentMethod { get; set; } = "PSE";

    public string? BankName { get; set; }
    public string? BankCode { get; set; }
    public string? PersonType { get; set; } // "NATURAL" / "JURIDICA"
    public string? CardHolder { get; set; }
    public string? CardNumber { get; set; }
    public string? CardExpiry { get; set; }
    public string? CardCvv { get; set; }
    public string? RedirectUrl { get; set; }
}

public class PaymentSessionResponseDto
{
    public string ReferenceId { get; set; } = null!;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "COP";
    public string PublicKey { get; set; } = null!;
    public string Signature { get; set; } = null!;
    public string CheckoutUrl { get; set; } = null!;
    public string Status { get; set; } = "PENDING";
    public string PlanName { get; set; } = null!;
    public bool IsUpgrade { get; set; }
}

public class PaymentWebhookDto
{
    [Required]
    [JsonPropertyName("event")]
    public string Event { get; set; } = null!; // "transaction.updated"

    [Required]
    [JsonPropertyName("data")]
    public WebhookDataDto Data { get; set; } = null!;

    [JsonPropertyName("signature")]
    public string? Signature { get; set; }

    [JsonPropertyName("timestamp")]
    public long Timestamp { get; set; }
}

public class WebhookDataDto
{
    [JsonPropertyName("transaction")]
    public WebhookTransactionDto Transaction { get; set; } = null!;
}

public class WebhookTransactionDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!; // Pasarela Transaction ID

    [JsonPropertyName("reference")]
    public string Reference { get; set; } = null!; // Nuestra ReferenciaExterna

    [JsonPropertyName("amount_in_cents")]
    public decimal AmountInCents { get; set; }

    [JsonPropertyName("amountInCents")]
    public decimal? AmountInCentsAlt { set { if (value.HasValue) AmountInCents = value.Value; } }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "COP";

    [JsonPropertyName("status")]
    public string Status { get; set; } = null!; // "APPROVED", "DECLINED", "VOIDED", "ERROR"

    [JsonPropertyName("payment_method_type")]
    public string? PaymentMethodType { get; set; } = "PSE"; // "PSE", "CARD", etc.

    [JsonPropertyName("paymentMethodType")]
    public string? PaymentMethodTypeAlt { set { if (!string.IsNullOrEmpty(value)) PaymentMethodType = value; } }

    [JsonPropertyName("status_reason")]
    public string? StatusReason { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}

public class PaymentStatusResponseDto
{
    public string ReferenceId { get; set; } = null!;
    public string Status { get; set; } = null!; // "PENDING", "APPROVED", "RECHAZADO", "CANCELADO"
    public decimal Amount { get; set; }
    public string PlanName { get; set; } = null!;
    public string? PaymentMethod { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string Message { get; set; } = null!;
}
