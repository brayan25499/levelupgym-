namespace LevelUpGym.Api.DTOs;

public class LoginRequest
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
}

public class RegisterRequest
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public string Apellidos { get; set; } = null!;
    public string TipoDocumento { get; set; } = null!;
    public string NumDocumento { get; set; } = null!;
    public string? Sexo { get; set; }
    public string? Telefono { get; set; }
    public decimal Peso { get; set; }
    public decimal Estatura { get; set; }
}

public class AuthResponse
{
    public string Email { get; set; } = null!;
    public string Token { get; set; } = null!;
}
