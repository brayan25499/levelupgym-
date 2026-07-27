using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.Models;
using LevelUpGym.Api.DTOs;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using LevelUpGym.Api.Services;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly LevelUpDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IOtpService _otpService;
    private readonly IEmailService _emailService;

    public AuthController(LevelUpDbContext context, IJwtService jwtService, IOtpService otpService, IEmailService emailService)
    {
        _context = context;
        _jwtService = jwtService;
        _otpService = otpService;
        _emailService = emailService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        // Validaciones del backend
        var validationError = ValidateRegisterRequest(request);
        if (validationError != null)
        {
            return BadRequest(validationError);
        }

        // Trimear y normalizar datos
        request.Email = request.Email?.Trim().ToLower() ?? "";
        request.Nombre = request.Nombre?.Trim() ?? "";
        request.Apellidos = request.Apellidos?.Trim() ?? "";
        request.NumDocumento = request.NumDocumento?.Trim() ?? "";
        request.Telefono = request.Telefono?.Trim() ?? "";

        if (await _context.Auths.AnyAsync(u => u.Email == request.Email))
        {
            return BadRequest("El correo electrónico ya está registrado.");
        }

        if (await _context.Profiles.AnyAsync(p => p.NumDocumento == request.NumDocumento))
        {
            return BadRequest("El número de documento ya está registrado.");
        }

        // Validar que el teléfono no esté asociado a otro usuario registrado
        if (!string.IsNullOrWhiteSpace(request.Telefono))
        {
            var existingProfileWithPhone = await _context.Profiles
                .FirstOrDefaultAsync(p => p.Telefono == request.Telefono);
            if (existingProfileWithPhone != null)
            {
                var existingAuth = await _context.Auths
                    .FirstOrDefaultAsync(a => a.IdProfile == existingProfileWithPhone.IdProfile);
                if (existingAuth != null)
                {
                    return BadRequest("El número de celular ya está asociado a una cuenta registrada.");
                }
            }
        }

        // Create Profile
        var profile = new Profile
        {
            Nombre = request.Nombre,
            Apellidos = request.Apellidos,
            TipoDocumento = request.TipoDocumento,
            NumDocumento = request.NumDocumento,
            Sexo = request.Sexo,
            Telefono = request.Telefono,
            Peso = request.Peso,
            Estatura = request.Estatura,
            CreatedAt = DateTime.UtcNow
        };

        _context.Profiles.Add(profile);
        await _context.SaveChangesAsync();

        // Create Auth
        using var hmac = new HMACSHA512();
        var auth = new Auth
        {
            IdProfile = profile.IdProfile,
            Email = request.Email,
            Password = hmac.ComputeHash(Encoding.UTF8.GetBytes(request.Password)),
            PasswordSalt = hmac.Key,
            Estado = "ACTIVO",
            CreatedAt = DateTime.UtcNow
        };

        _context.Auths.Add(auth);
        await _context.SaveChangesAsync();

        // Create Client (Gym Specific)
        var client = new Client
        {
            IdProfile = profile.IdProfile,
            Estado = "ACTIVO",
            CreatedAt = DateTime.UtcNow
        };
        _context.Clients.Add(client);
        await _context.SaveChangesAsync();

        return new AuthResponse
        {
            Email = auth.Email,
            Token = _jwtService.CreateToken(auth)
        };
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLower();
        var password = request.Password.Trim();

        var auth = await _context.Auths.FirstOrDefaultAsync(u => u.Email == email);

        if (auth == null)
        {
            Console.WriteLine($"Login failed: User {email} not found.");
            return Unauthorized("Usuario no encontrado.");
        }

        using var hmac = new HMACSHA512(auth.PasswordSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));

        for (int i = 0; i < computedHash.Length; i++)
        {
            if (computedHash[i] != auth.Password[i]) 
            {
                Console.WriteLine($"Login failed: Password mismatch for {email}.");
                return Unauthorized("Contraseña incorrecta.");
            }
        }

        Console.WriteLine($"Login success: {email} logged in.");
        return new AuthResponse
        {
            Email = auth.Email,
            Token = _jwtService.CreateToken(auth)
        };
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var email = request.Email.Trim().ToLower();
        var numDoc = request.NumDocumento.Trim();
        var newPassword = request.NewPassword.Trim();

        var auth = await _context.Auths.FirstOrDefaultAsync(u => u.Email == email);
        if (auth == null)
        {
            return BadRequest("El correo electrónico no está registrado.");
        }

        var profile = await _context.Profiles.FirstOrDefaultAsync(p => p.IdProfile == auth.IdProfile);
        if (profile == null || profile.NumDocumento != numDoc)
        {
            return BadRequest("El número de documento no coincide con el registrado para esta cuenta.");
        }

        using var hmac = new HMACSHA512();
        auth.Password = hmac.ComputeHash(Encoding.UTF8.GetBytes(newPassword));
        auth.PasswordSalt = hmac.Key;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Contraseña restablecida exitosamente." });
    }

    // ===== OTP-Based Password Recovery Endpoints =====

    [HttpPost("check-email")]
    public async Task<IActionResult> CheckEmail(CheckEmailDto request)
    {
        var email = request.Email?.Trim().ToLower() ?? "";
        
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { message = "El correo electrónico es obligatorio." });
        }

        var auth = await _context.Auths.FirstOrDefaultAsync(u => u.Email == email);
        
        if (auth == null)
        {
            return NotFound(new { message = "El correo electrónico ingresado no se encuentra registrado en el sistema." });
        }

        var profile = await _context.Profiles.FirstOrDefaultAsync(p => p.IdProfile == auth.IdProfile);
        
        var hasPhone = !string.IsNullOrWhiteSpace(profile?.Telefono);
        
        return Ok(new 
        { 
            maskedEmail = MaskEmail(auth.Email),
            maskedPhone = hasPhone ? MaskPhone(profile!.Telefono) : null,
            hasPhone = hasPhone
        });
    }

    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp(RequestOtpDto request)
    {
        var email = request.Email?.Trim().ToLower() ?? "";
        var medium = request.Medium?.Trim().ToLower() ?? "email"; // "email" or "phone"
        
        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new { message = "Datos inválidos." });
        }

        var auth = await _context.Auths.FirstOrDefaultAsync(u => u.Email == email);
        
        if (auth == null)
        {
            return NotFound(new { message = "Cuenta no encontrada." });
        }

        // Check resend cooldown
        if (!_otpService.CanResend(auth.Email))
        {
            return BadRequest(new { message = "Debes esperar antes de solicitar un nuevo código." });
        }

        var code = _otpService.GenerateOtp(auth.Email);
        
        if (medium == "phone")
        {
            var profile = await _context.Profiles.FirstOrDefaultAsync(p => p.IdProfile == auth.IdProfile);
            if (profile == null || string.IsNullOrWhiteSpace(profile.Telefono))
            {
                return BadRequest(new { message = "No hay un número de celular asociado a esta cuenta." });
            }
            // Simular envío de SMS (imprimiendo en consola)
            Console.WriteLine("\n=========================================");
            Console.WriteLine("RECUPERACIÓN DE CONTRASEÑA");
            Console.WriteLine("=========================================");
            Console.WriteLine($"Usuario: {profile.Telefono}");
            Console.WriteLine("Método seleccionado: SMS");
            Console.WriteLine($"Código OTP: {code}");
            Console.WriteLine($"Generado: {DateTime.Now:HH:mm:ss}");
            Console.WriteLine("Expira en: 5 minutos");
            Console.WriteLine("=========================================\n");
        }
        else
        {
            // Enviar por correo
            await _emailService.SendOtpEmail(auth.Email, code);
        }

        return Ok(new { message = "Código enviado correctamente." });
    }

    [HttpPost("verify-otp")]
    public IActionResult VerifyOtp(VerifyOtpDto request)
    {
        var email = request.Email?.Trim().ToLower() ?? "";
        var code = request.Code?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(code))
        {
            return BadRequest(new { message = "Datos incompletos." });
        }

        var (isValid, error, remainingAttempts) = _otpService.ValidateOtp(email, code);

        if (!isValid)
        {
            return BadRequest(new { message = error, remainingAttempts });
        }

        return Ok(new { message = "Código verificado correctamente.", verified = true });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto request)
    {
        var email = request.Email?.Trim().ToLower() ?? "";
        var code = request.Code?.Trim() ?? "";
        var newPassword = request.NewPassword ?? "";

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(newPassword))
        {
            return BadRequest(new { message = "Datos incompletos." });
        }

        // Validate OTP one more time before changing password
        var (isValid, error, _) = _otpService.ValidateOtp(email, code);
        if (!isValid)
        {
            return BadRequest(new { message = error });
        }

        // Validate password strength
        if (newPassword.Length < 8) return BadRequest(new { message = "La contraseña debe tener al menos 8 caracteres." });
        if (!System.Text.RegularExpressions.Regex.IsMatch(newPassword, @"[A-Z]")) return BadRequest(new { message = "La contraseña debe contener al menos una mayúscula." });
        if (!System.Text.RegularExpressions.Regex.IsMatch(newPassword, @"[a-z]")) return BadRequest(new { message = "La contraseña debe contener al menos una minúscula." });
        if (!System.Text.RegularExpressions.Regex.IsMatch(newPassword, @"\d")) return BadRequest(new { message = "La contraseña debe contener al menos un número." });
        if (!System.Text.RegularExpressions.Regex.IsMatch(newPassword, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]")) return BadRequest(new { message = "La contraseña debe contener al menos un carácter especial." });

        var auth = await _context.Auths.FirstOrDefaultAsync(u => u.Email == email);
        if (auth == null)
        {
            return BadRequest(new { message = "No se pudo actualizar la contraseña." });
        }

        using var hmac = new HMACSHA512();
        auth.Password = hmac.ComputeHash(Encoding.UTF8.GetBytes(newPassword));
        auth.PasswordSalt = hmac.Key;
        auth.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Consume the OTP so it can't be reused
        _otpService.ConsumeOtp(email);

        return Ok(new { message = "Tu contraseña fue actualizada correctamente." });
    }

    /// <summary>
    /// Masks an email for display: u***r@domain.com
    /// </summary>
    private static string MaskEmail(string email)
    {
        var parts = email.Split('@');
        if (parts.Length != 2 || parts[0].Length < 2) return email;
        var local = parts[0];
        var masked = local[0] + new string('*', Math.Max(local.Length - 2, 1)) + local[^1];
        return masked + "@" + parts[1];
    }

    /// <summary>
    /// Masks a phone number for display: ******4567
    /// </summary>
    private static string MaskPhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone) || phone.Length < 4) return phone;
        var lastFour = phone.Substring(phone.Length - 4);
        return new string('*', phone.Length - 4) + lastFour;
    }

    // Método privado para validar el registro
    private string? ValidateRegisterRequest(RegisterRequest request)
    {
        // Validar Nombre
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return "El nombre es obligatorio.";
        
        request.Nombre = request.Nombre.Trim();
        if (request.Nombre != request.Nombre.Trim() || request.Nombre.StartsWith(" ") || request.Nombre.EndsWith(" "))
            return "El nombre no debe tener espacios al inicio o al final.";

        // Validar Apellidos
        if (string.IsNullOrWhiteSpace(request.Apellidos))
            return "Los apellidos son obligatorios.";
        
        request.Apellidos = request.Apellidos.Trim();
        if (request.Apellidos != request.Apellidos.Trim() || request.Apellidos.StartsWith(" ") || request.Apellidos.EndsWith(" "))
            return "Los apellidos no deben tener espacios al inicio o al final.";

        // Validar Email
        if (string.IsNullOrWhiteSpace(request.Email))
            return "El email es obligatorio.";
        
        // No permitir espacios en el correo electrónico
        if (request.Email.Contains(" "))
            return "El correo electrónico no puede contener espacios.";
        
        request.Email = request.Email.Trim();
        if (!request.Email.Contains("@"))
            return "El email debe contener @.";

        var emailPattern = @"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$";
        if (!Regex.IsMatch(request.Email, emailPattern))
            return "Formato de email inválido.";

        // Validar Contraseña
        if (string.IsNullOrWhiteSpace(request.Password))
            return "La contraseña es obligatoria.";

        if (request.Password.Contains(" "))
            return "La contraseña no puede contener espacios.";

        if (request.Password.Length < 8)
            return "La contraseña debe tener al menos 8 caracteres.";

        if (!Regex.IsMatch(request.Password, @"[A-Z]"))
            return "La contraseña debe contener al menos una mayúscula.";

        if (!Regex.IsMatch(request.Password, @"[a-z]"))
            return "La contraseña debe contener al menos una minúscula.";

        if (!Regex.IsMatch(request.Password, @"\d"))
            return "La contraseña debe contener al menos un número.";

        if (!Regex.IsMatch(request.Password, @"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]"))
            return "La contraseña debe contener al menos un carácter especial (!@#$%^&*).";

        // Validar Número de Documento
        if (string.IsNullOrWhiteSpace(request.NumDocumento))
            return "El número de documento es obligatorio.";

        // No permitir espacios en el número de documento
        if (request.NumDocumento.Contains(" "))
            return "El número de documento no puede contener espacios.";

        if (!Regex.IsMatch(request.NumDocumento, @"^\d+$"))
            return "El número de documento solo debe contener números.";

        // Validar Teléfono si se proporciona
        if (!string.IsNullOrWhiteSpace(request.Telefono))
        {
            request.Telefono = request.Telefono.Trim();
            if (request.Telefono.Contains(" "))
                return "El teléfono no puede contener espacios.";

            if (!Regex.IsMatch(request.Telefono, @"^\+?\d+$"))
                return "El teléfono solo debe contener números y opcionalmente un + al inicio.";

            if (request.Telefono.Length > 30)
                return "El teléfono no puede tener más de 30 caracteres.";
        }

        // Validar Peso si se proporciona
        if (request.Peso.HasValue)
        {
            if (request.Peso <= 0 || request.Peso > 999)
                return "El peso debe ser un número válido entre 0 y 999.";
        }

        // Validar Estatura si se proporciona
        if (request.Estatura.HasValue)
        {
            if (request.Estatura <= 0 || request.Estatura > 999)
                return "La estatura debe ser un número válido entre 0 y 999.";
        }

        return null; // Sin errores
    }
}
