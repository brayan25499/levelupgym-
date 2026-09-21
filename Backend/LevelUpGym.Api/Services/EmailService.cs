namespace LevelUpGym.Api.Services;

public interface IEmailService
{
    /// <summary>
    /// Sends an OTP code to the user's email address.
    /// </summary>
    Task SendOtpEmail(string email, string code);
}

/// <summary>
/// Stub implementation that prints the OTP to the console.
/// Replace with a real email provider (SendGrid, SMTP, etc.) in production.
/// </summary>
public class ConsoleEmailService : IEmailService
{
    public Task SendOtpEmail(string email, string code)
    {
        Console.WriteLine("\n=========================================");
        Console.WriteLine("RECUPERACIÓN DE CONTRASEÑA");
        Console.WriteLine("=========================================");
        Console.WriteLine($"Usuario: {email}");
        Console.WriteLine("Método seleccionado: Correo Electrónico");
        Console.WriteLine($"Código OTP: {code}");
        Console.WriteLine($"Generado: {DateTime.Now:HH:mm:ss}");
        Console.WriteLine("Expira en: 5 minutos");
        Console.WriteLine("=========================================\n");
        return Task.CompletedTask;
    }
}
