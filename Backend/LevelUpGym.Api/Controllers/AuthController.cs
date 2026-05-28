using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.Models;
using LevelUpGym.Api.DTOs;
using System.Security.Cryptography;
using System.Text;
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
}
