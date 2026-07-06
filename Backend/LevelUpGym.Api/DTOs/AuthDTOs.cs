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
    public string? RefreshToken { get; set; }
}

public class RefreshRequest
{
    public string RefreshToken { get; set; } = null!;
}

public class ForgotPasswordRequest
{
    public string Email { get; set; } = null!;
    public string NumDocumento { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}

public class GoogleLoginRequest
{
    public string IdToken { get; set; } = null!;
}

public class RequestResetPasswordRequest
{
    public string Email { get; set; } = null!;
}

public class ResetPasswordRequest
{
    public string Token { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}
