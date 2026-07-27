namespace LevelUpGym.Api.Models;

/// <summary>
/// Represents an OTP entry stored in memory for password recovery.
/// </summary>
public class OtpEntry
{
    public string Email { get; set; } = null!;
    public string Code { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int Attempts { get; set; }
    public DateTime? LockedUntil { get; set; }
    public bool IsUsed { get; set; }
}
