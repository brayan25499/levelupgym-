using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using LevelUpGym.Api.Models;

namespace LevelUpGym.Api.Services;

public interface IJwtService
{
    string CreateToken(Auth auth);
}

public class JwtService : IJwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config)
    {
        _config = config;
    }

    public string CreateToken(Auth auth)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Email, auth.Email),
            new Claim(ClaimTypes.NameIdentifier, auth.IdProfile.ToString()),
            new Claim("IdAuth", auth.IdAuth.ToString())
        };

        var secretKey = _config["Jwt:Key"] 
            ?? _config["JWT_SECRET"] 
            ?? "LevelUpGym_SuperSecret_SecurityKey_2026_MustBeAtLeast512BitsLong_ForHMACSHA512_Algorithm_Validation!";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(8),
            SigningCredentials = creds,
            Issuer = _config["Jwt:Issuer"] ?? "LevelUpGymApi",
            Audience = _config["Jwt:Audience"] ?? "LevelUpGymClient"
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}
