using Google.Apis.Auth;

namespace LevelUpGym.Api.Services;

public interface IGoogleAuthService
{
    /// <summary>
    /// Valida el id_token emitido por Google Identity Services.
    /// Devuelve el payload (email, nombre, etc.) si es válido, o null si no lo es.
    /// </summary>
    Task<GoogleJsonWebSignature.Payload?> ValidateIdTokenAsync(string idToken);
}

public class GoogleAuthService : IGoogleAuthService
{
    private readonly IConfiguration _config;

    public GoogleAuthService(IConfiguration config)
    {
        _config = config;
    }

    public async Task<GoogleJsonWebSignature.Payload?> ValidateIdTokenAsync(string idToken)
    {
        var clientId = _config["Google:ClientId"];

        if (string.IsNullOrWhiteSpace(clientId))
        {
            // Error de configuración, no de código: falta el ClientId en appsettings.
            Console.WriteLine("[GOOGLE AUTH ERROR] Falta configurar 'Google:ClientId' en appsettings.json.");
            return null;
        }

        if (string.IsNullOrWhiteSpace(idToken))
        {
            return null;
        }

        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId }
            };

            // ValidateAsync verifica firma, expiración, issuer y audience contra los servidores de Google.
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            return payload;
        }
        catch (InvalidJwtException ex)
        {
            Console.WriteLine($"[GOOGLE AUTH ERROR] Token inválido o expirado: {ex.Message}");
            return null;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GOOGLE AUTH ERROR] {ex.Message}");
            return null;
        }
    }
}