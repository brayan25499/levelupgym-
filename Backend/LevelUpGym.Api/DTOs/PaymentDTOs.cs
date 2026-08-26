namespace LevelUpGym.Api.DTOs;

public class ProcessPaymentDto
{
    public int NewPlanId { get; set; }
    public string PaymentMethod { get; set; } = "PSE"; // "PSE" or "TARJETA"
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
