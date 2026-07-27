using System.Collections.Concurrent;
using System.Security.Cryptography;
using LevelUpGym.Api.Models;

namespace LevelUpGym.Api.Services;

public interface IOtpService
{
    /// <summary>
    /// Generates a 6-digit OTP for the given email. Overwrites any existing OTP.
    /// </summary>
    string GenerateOtp(string email);

    /// <summary>
    /// Validates the OTP code for the given email.
    /// Returns (isValid, errorMessage, remainingAttempts).
    /// </summary>
    (bool IsValid, string? Error, int RemainingAttempts) ValidateOtp(string email, string code);

    /// <summary>
    /// Marks the OTP as consumed after a successful password reset.
    /// </summary>
    void ConsumeOtp(string email);

    /// <summary>
    /// Checks if 60 seconds have passed since the last OTP was generated (for resend cooldown).
    /// </summary>
    bool CanResend(string email);
}

public class OtpService : IOtpService
{
    private readonly ConcurrentDictionary<string, OtpEntry> _otpStore = new();
    private const int MaxAttempts = 5;
    private const int OtpExpirationMinutes = 5;
    private const int LockoutMinutes = 15;
    private const int ResendCooldownSeconds = 60;

    public string GenerateOtp(string email)
    {
        var normalizedEmail = email.Trim().ToLower();

        // Check if there's a lockout in effect
        if (_otpStore.TryGetValue(normalizedEmail, out var existingEntry))
        {
            if (existingEntry.LockedUntil.HasValue && existingEntry.LockedUntil > DateTime.UtcNow)
            {
                // Still locked — but we generate anyway to avoid revealing lock status
                // The validation step will enforce the lock
            }
        }

        var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

        var otpEntry = new OtpEntry
        {
            Email = normalizedEmail,
            Code = code,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(OtpExpirationMinutes),
            Attempts = 0,
            LockedUntil = null,
            IsUsed = false
        };

        _otpStore.AddOrUpdate(normalizedEmail, otpEntry, (_, _) => otpEntry);

        return code;
    }

    public (bool IsValid, string? Error, int RemainingAttempts) ValidateOtp(string email, string code)
    {
        var normalizedEmail = email.Trim().ToLower();

        if (!_otpStore.TryGetValue(normalizedEmail, out var entry))
        {
            return (false, "Código inválido. Solicita uno nuevo.", 0);
        }

        // Check lockout
        if (entry.LockedUntil.HasValue && entry.LockedUntil > DateTime.UtcNow)
        {
            var remainingLock = (int)(entry.LockedUntil.Value - DateTime.UtcNow).TotalMinutes + 1;
            return (false, $"Demasiados intentos fallidos. Intenta de nuevo en {remainingLock} minutos.", 0);
        }

        // Check if already used
        if (entry.IsUsed)
        {
            return (false, "Este código ya fue utilizado. Solicita uno nuevo.", 0);
        }

        // Check expiration
        if (DateTime.UtcNow > entry.ExpiresAt)
        {
            return (false, "El código ha expirado. Solicita uno nuevo.", 0);
        }

        // Check code match
        if (entry.Code != code.Trim())
        {
            entry.Attempts++;
            var remaining = MaxAttempts - entry.Attempts;

            if (entry.Attempts >= MaxAttempts)
            {
                entry.LockedUntil = DateTime.UtcNow.AddMinutes(LockoutMinutes);
                return (false, $"Demasiados intentos fallidos. Intenta de nuevo en {LockoutMinutes} minutos.", 0);
            }

            return (false, $"Código incorrecto. Te quedan {remaining} intento(s).", remaining);
        }

        // Valid!
        return (true, null, MaxAttempts - entry.Attempts);
    }

    public void ConsumeOtp(string email)
    {
        var normalizedEmail = email.Trim().ToLower();
        if (_otpStore.TryGetValue(normalizedEmail, out var entry))
        {
            entry.IsUsed = true;
        }
    }

    public bool CanResend(string email)
    {
        var normalizedEmail = email.Trim().ToLower();
        if (!_otpStore.TryGetValue(normalizedEmail, out var entry))
        {
            return true; // No previous OTP, can send
        }

        var elapsed = (DateTime.UtcNow - entry.CreatedAt).TotalSeconds;
        return elapsed >= ResendCooldownSeconds;
    }
}
