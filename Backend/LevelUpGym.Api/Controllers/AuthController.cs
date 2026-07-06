using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.DTOs;
using LevelUpGym.Api.Models;
using LevelUpGym.Api.Services;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly LevelUpDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _config;

    public AuthController(LevelUpDbContext context, IJwtService jwtService, IConfiguration config)
    {
        _context = context;
        _jwtService = jwtService;
        _config = config;
    }

    private string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    private bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        // Strip out middle spaces
        if (email.Contains(" ")) return false;
        try
        {
            // Simple email regex validation
            return Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase, TimeSpan.FromMilliseconds(250));
        }
        catch (RegexMatchTimeoutException)
        {
            return false;
        }
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        // Sanitization
        var email = request.Email.Replace(" ", "").ToLower().Trim();
        var password = request.Password.Trim();

        if (!IsValidEmail(email))
        {
            return BadRequest("Formato de correo electrónico inválido.");
        }

        if (string.IsNullOrEmpty(password) || password.Length < 8 || password.Length > 64)
        {
            return BadRequest("La contraseña debe tener entre 8 y 64 caracteres sin espacios al inicio ni al final.");
        }

        if (await _context.Auths.AnyAsync(u => u.Email == email))
        {
            return BadRequest("El correo electrónico ya está registrado.");
        }

        if (await _context.Profiles.AnyAsync(p => p.NumDocumento == request.NumDocumento.Trim()))
        {
            return BadRequest("El número de documento ya está registrado.");
        }

        // Create Profile
        var profile = new Profile
        {
            Nombre = request.Nombre.Trim(),
            Apellidos = request.Apellidos.Trim(),
            TipoDocumento = request.TipoDocumento.Trim(),
            NumDocumento = request.NumDocumento.Trim(),
            Sexo = request.Sexo?.Trim(),
            Telefono = request.Telefono?.Trim(),
            Peso = request.Peso,
            Estatura = request.Estatura,
            CreatedAt = DateTime.UtcNow
        };

        _context.Profiles.Add(profile);
        await _context.SaveChangesAsync();

        // Create Auth
        using var hmac = new HMACSHA512();
        var refreshToken = GenerateRefreshToken();
        var auth = new Auth
        {
            IdProfile = profile.IdProfile,
            Email = email,
            Password = hmac.ComputeHash(Encoding.UTF8.GetBytes(password)),
            PasswordSalt = hmac.Key,
            Estado = "ACTIVO",
            RefreshToken = refreshToken,
            RefreshTokenExpires = DateTime.UtcNow.AddDays(7),
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
            Token = _jwtService.CreateToken(auth),
            RefreshToken = refreshToken
        };
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        // Sanitization
        var email = request.Email.Replace(" ", "").ToLower().Trim();
        var password = request.Password.Trim();

        // Generic error message constraint
        const string genericError = "Correo o contraseña incorrectos";

        if (!IsValidEmail(email) || string.IsNullOrEmpty(password) || password.Length < 8 || password.Length > 64)
        {
            Console.WriteLine($"[Login Failed] Invalid input format for {email}");
            return Unauthorized(new { message = genericError });
        }

        var auth = await _context.Auths.FirstOrDefaultAsync(u => u.Email == email);
        if (auth == null)
        {
            Console.WriteLine($"[Login Failed] User {email} not found.");
            return Unauthorized(new { message = genericError });
        }

        // Lockout validation
        if (auth.LockoutEnd.HasValue && auth.LockoutEnd.Value > DateTime.UtcNow)
        {
            Console.WriteLine($"[Login Blocked] User {email} is locked out until {auth.LockoutEnd.Value}");
            return Unauthorized(new { message = genericError });
        }

        // Password hash check
        using var hmac = new HMACSHA512(auth.PasswordSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        bool passwordMatches = true;

        for (int i = 0; i < computedHash.Length; i++)
        {
            if (computedHash[i] != auth.Password[i]) 
            {
                passwordMatches = false;
            }
        }

        if (!passwordMatches)
        {
            Console.WriteLine($"[Login Failed] Password mismatch for {email}.");
            auth.FailedLoginAttempts++;
            if (auth.FailedLoginAttempts >= 5)
            {
                auth.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
                Console.WriteLine($"[Login Lockout] User {email} locked for 15 minutes due to 5 consecutive failed attempts.");
            }
            await _context.SaveChangesAsync();
            return Unauthorized(new { message = genericError });
        }

        // Success: reset attempts
        auth.FailedLoginAttempts = 0;
        auth.LockoutEnd = null;

        var refreshToken = GenerateRefreshToken();
        auth.RefreshToken = refreshToken;
        auth.RefreshTokenExpires = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();
        Console.WriteLine($"[Login Success] User {email} authenticated.");

        return new AuthResponse
        {
            Email = auth.Email,
            Token = _jwtService.CreateToken(auth),
            RefreshToken = refreshToken
        };
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
    {
        var token = request.RefreshToken.Trim();
        var auth = await _context.Auths.FirstOrDefaultAsync(u => u.RefreshToken == token && u.RefreshTokenExpires > DateTime.UtcNow);
        if (auth == null)
        {
            return Unauthorized(new { message = "Sesión inválida o expirada." });
        }

        var newRefreshToken = GenerateRefreshToken();
        auth.RefreshToken = newRefreshToken;
        auth.RefreshTokenExpires = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return new AuthResponse
        {
            Email = auth.Email,
            Token = _jwtService.CreateToken(auth),
            RefreshToken = newRefreshToken
        };
    }

    [HttpPost("logout-session")]
    public async Task<IActionResult> LogoutSession(RefreshRequest request)
    {
        var token = request.RefreshToken.Trim();
        var auth = await _context.Auths.FirstOrDefaultAsync(u => u.RefreshToken == token);
        if (auth != null)
        {
            auth.RefreshToken = null;
            auth.RefreshTokenExpires = null;
            await _context.SaveChangesAsync();
        }
        return Ok(new { message = "Sesión cerrada correctamente." });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var email = request.Email.Replace(" ", "").ToLower().Trim();
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

        auth.RefreshToken = null;
        auth.RefreshTokenExpires = null;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Contraseña restablecida exitosamente." });
    }

    [HttpPost("request-reset-password")]
    public async Task<IActionResult> RequestResetPassword(RequestResetPasswordRequest request)
    {
        var email = request.Email.Replace(" ", "").ToLower().Trim();

        if (!IsValidEmail(email))
        {
            return BadRequest("Formato de correo electrónico inválido.");
        }

        var auth = await _context.Auths.FirstOrDefaultAsync(u => u.Email == email);
        if (auth == null)
        {
            // Do not reveal email existence
            return Ok(new { message = "Si el correo está registrado, recibirás un enlace de recuperación." });
        }

        var token = Guid.NewGuid().ToString("N");
        auth.ResetToken = token;
        auth.ResetTokenExpires = DateTime.UtcNow.AddHours(2);
        await _context.SaveChangesAsync();

        try
        {
            var smtpSection = _config.GetSection("Smtp");
            var host = smtpSection["Host"] ?? "localhost";
            var port = int.Parse(smtpSection["Port"] ?? "25");
            var username = smtpSection["Username"] ?? "";
            var password = smtpSection["Password"] ?? "";
            var from = smtpSection["From"] ?? "no-reply@levelupgym.com";

            using var smtpClient = new System.Net.Mail.SmtpClient(host, port);
            if (!string.IsNullOrEmpty(username) && !string.IsNullOrEmpty(password))
            {
                smtpClient.Credentials = new System.Net.NetworkCredential(username, password);
                smtpClient.EnableSsl = true;
            }

            var resetUrl = $"http://localhost:4200/login?token={token}";
            var mailMessage = new System.Net.Mail.MailMessage
            {
                From = new System.Net.Mail.MailAddress(from),
                Subject = "Recuperación de Contraseña - LevelUp Gym",
                Body = $"<h3>LevelUp Gym - Recuperación de Contraseña</h3>" +
                       $"<p>Hola,</p>" +
                       $"<p>Has solicitado restablecer tu contraseña. Haz clic en el enlace para ingresar tu nueva contraseña:</p>" +
                       $"<p><a href='{resetUrl}'>{resetUrl}</a></p>" +
                       $"<p>Este enlace expirará en 2 horas.</p>" +
                       $"<p>Si no solicitaste este cambio, puedes ignorar este correo.</p>",
                IsBodyHtml = true
            };
            mailMessage.To.Add(email);

            await smtpClient.SendMailAsync(mailMessage);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SMTP Error] Fallo al enviar correo de recuperación: {ex.Message}");
        }

        return Ok(new { message = "Si el correo está registrado, recibirás un enlace de recuperación." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var auth = await _context.Auths.FirstOrDefaultAsync(u => u.ResetToken == request.Token && u.ResetTokenExpires > DateTime.UtcNow);
        if (auth == null)
        {
            return BadRequest("El token de restablecimiento es inválido o ha expirado.");
        }

        using var hmac = new HMACSHA512();
        auth.Password = hmac.ComputeHash(Encoding.UTF8.GetBytes(request.NewPassword.Trim()));
        auth.PasswordSalt = hmac.Key;
        
        // Single-use token invalidation
        auth.ResetToken = null;
        auth.ResetTokenExpires = null;

        auth.RefreshToken = null;
        auth.RefreshTokenExpires = null;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Tu contraseña ha sido restablecida exitosamente." });
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleLogin(GoogleLoginRequest request)
    {
        try
        {
            var parts = request.IdToken.Split('.');
            if (parts.Length < 2) return BadRequest("Token de Google inválido.");
            var payloadBase64 = parts[1];
            payloadBase64 = payloadBase64.Replace('-', '+').Replace('_', '/');
            switch (payloadBase64.Length % 4)
            {
                case 2: payloadBase64 += "=="; break;
                case 3: payloadBase64 += "="; break;
            }
            var bytes = Convert.FromBase64String(payloadBase64);
            var json = Encoding.UTF8.GetString(bytes);
            var googleUser = System.Text.Json.JsonSerializer.Deserialize<GoogleUserPayload>(json, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (googleUser == null || string.IsNullOrEmpty(googleUser.Email))
            {
                return BadRequest("No se pudo obtener información del perfil de Google.");
            }

            var email = googleUser.Email.Replace(" ", "").ToLower().Trim();
            var auth = await _context.Auths.FirstOrDefaultAsync(u => u.Email == email);

            if (auth == null)
            {
                // Create profile
                var profile = new Profile
                {
                    Nombre = googleUser.GivenName ?? "GoogleUser",
                    Apellidos = googleUser.FamilyName ?? "LevelUp",
                    TipoDocumento = "CC",
                    NumDocumento = "G-" + googleUser.Sub.Substring(Math.Max(0, googleUser.Sub.Length - 10)),
                    Sexo = "Otro",
                    Telefono = "",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Profiles.Add(profile);
                await _context.SaveChangesAsync();

                using var hmac = new HMACSHA512();
                var googleRefreshToken = GenerateRefreshToken();
                auth = new Auth
                {
                    IdProfile = profile.IdProfile,
                    Email = email,
                    Password = hmac.ComputeHash(Encoding.UTF8.GetBytes(Guid.NewGuid().ToString("N"))),
                    PasswordSalt = hmac.Key,
                    Estado = "ACTIVO",
                    RefreshToken = googleRefreshToken,
                    RefreshTokenExpires = DateTime.UtcNow.AddDays(7),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Auths.Add(auth);
                await _context.SaveChangesAsync();

                // Create client role
                var client = new Client
                {
                    IdProfile = profile.IdProfile,
                    Estado = "ACTIVO",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Clients.Add(client);

                var clientRole = await _context.Roles.FirstOrDefaultAsync(r => r.Nombre == "Client") 
                    ?? new Role { Nombre = "Client" };
                if (clientRole.IdRol == 0)
                {
                    _context.Roles.Add(clientRole);
                    await _context.SaveChangesAsync();
                }

                _context.UserRoles.Add(new UserRole { IdAuth = auth.IdAuth, IdRol = clientRole.IdRol });
                await _context.SaveChangesAsync();
            }

            // Generate refresh token on Google Login if not newly created
            if (string.IsNullOrEmpty(auth.RefreshToken) || auth.RefreshTokenExpires < DateTime.UtcNow)
            {
                auth.RefreshToken = GenerateRefreshToken();
                auth.RefreshTokenExpires = DateTime.UtcNow.AddDays(7);
                await _context.SaveChangesAsync();
            }

            return new AuthResponse
            {
                Email = auth.Email,
                Token = _jwtService.CreateToken(auth),
                RefreshToken = auth.RefreshToken
            };
        }
        catch (Exception ex)
        {
            return BadRequest($"Error de inicio de sesión con Google: {ex.Message}");
        }
    }

    private class GoogleUserPayload
    {
        public string Email { get; set; } = null!;
        public string Sub { get; set; } = null!;
        public string? GivenName { get; set; }
        public string? FamilyName { get; set; }
    }
}
