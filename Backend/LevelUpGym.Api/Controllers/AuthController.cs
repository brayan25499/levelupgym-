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

    public AuthController(LevelUpDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
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
