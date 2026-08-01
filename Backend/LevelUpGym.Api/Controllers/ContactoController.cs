using Microsoft.AspNetCore.Mvc;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.Models;
using LevelUpGym.Api.DTOs;
using System.Text.RegularExpressions;

namespace LevelUpGym.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContactoController : ControllerBase
{
    private readonly LevelUpDbContext _context;

    // Allowed subjects (must match frontend dropdown values)
    private static readonly HashSet<string> AsuntosPermitidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "Membresías y Planes",
        "Clases y Horarios",
        "Entrenamiento Personal",
        "Tienda y Suplementos"
    };

    public ContactoController(LevelUpDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> EnviarMensaje(ContactMessageRequest request)
    {
        var errors = new Dictionary<string, string>();

        // --- Nombre validation ---
        if (string.IsNullOrWhiteSpace(request.Nombre))
        {
            errors["nombre"] = "El nombre es obligatorio.";
        }
        else
        {
            if (request.Nombre != request.Nombre.Trim())
                errors["nombre"] = "No se permiten espacios al inicio o al final del nombre.";
            else if (Regex.IsMatch(request.Nombre, @"\s{2,}"))
                errors["nombre"] = "No se permiten múltiples espacios consecutivos.";
            else if (!Regex.IsMatch(request.Nombre, @"^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$"))
                errors["nombre"] = "Solo se permiten letras, espacios, tildes y la letra ñ.";
        }

        // --- Correo validation ---
        if (string.IsNullOrWhiteSpace(request.Correo))
        {
            errors["correo"] = "El correo electrónico es obligatorio.";
        }
        else
        {
            if (request.Correo != request.Correo.Trim())
                errors["correo"] = "No se permiten espacios al inicio ni al final del correo electrónico.";
            else if (Regex.IsMatch(request.Correo, @"\s"))
                errors["correo"] = "No se permiten espacios en el correo electrónico.";
            else if (!request.Correo.Contains('@'))
                errors["correo"] = "El correo debe contener el símbolo '@'.";
            else if (!Regex.IsMatch(request.Correo.Split('@').Last(), @"\.[a-zA-Z]{2,}$"))
                errors["correo"] = "El correo debe contener un dominio válido (por ejemplo: .com, .net, .org).";
            else if (!Regex.IsMatch(request.Correo, @"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"))
                errors["correo"] = "El formato del correo electrónico no es válido.";
        }

        // --- Asunto validation ---
        if (string.IsNullOrWhiteSpace(request.Asunto))
        {
            errors["asunto"] = "El asunto es obligatorio.";
        }
        else if (!AsuntosPermitidos.Contains(request.Asunto.Trim()))
        {
            errors["asunto"] = "El asunto seleccionado no es válido.";
        }

        // --- Mensaje validation ---
        if (string.IsNullOrWhiteSpace(request.Mensaje))
        {
            errors["mensaje"] = "El mensaje es obligatorio.";
        }
        else
        {
            if (Regex.IsMatch(request.Mensaje, @"<[^>]*>", RegexOptions.IgnoreCase))
                errors["mensaje"] = "El mensaje no puede contener etiquetas HTML o scripts por seguridad.";
            else if (Regex.IsMatch(request.Mensaje, @"javascript\s*:", RegexOptions.IgnoreCase))
                errors["mensaje"] = "El mensaje contiene contenido potencialmente peligroso.";
            else if (Regex.IsMatch(request.Mensaje, @"on\w+\s*=", RegexOptions.IgnoreCase))
                errors["mensaje"] = "El mensaje contiene contenido potencialmente peligroso.";
        }

        if (errors.Count > 0)
            return BadRequest(new { errors });

        // Sanitize message before storing
        var sanitizedMensaje = SanitizeMensaje(request.Mensaje.Trim());

        var mensaje = new MensajeContacto
        {
            Nombre = request.Nombre.Trim(),
            Correo = request.Correo.Trim().ToLowerInvariant(),
            Asunto = request.Asunto.Trim(),
            Mensaje = sanitizedMensaje,
            FechaEnvio = DateTime.UtcNow,
            Estado = "Pendiente",
            CreatedAt = DateTime.UtcNow
        };

        _context.MensajesContacto.Add(mensaje);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tu mensaje ha sido enviado exitosamente. Te responderemos pronto." });
    }

    /// <summary>
    /// Strips any remaining HTML tags, javascript: protocols, and event handler attributes
    /// as a defense-in-depth measure before database storage.
    /// </summary>
    private static string SanitizeMensaje(string input)
    {
        var result = Regex.Replace(input, @"<[^>]*>", string.Empty);           // Remove HTML tags
        result = Regex.Replace(result, @"javascript\s*:", string.Empty, RegexOptions.IgnoreCase); // Remove javascript: protocol
        result = Regex.Replace(result, @"on\w+\s*=", string.Empty, RegexOptions.IgnoreCase);     // Remove event handlers
        return result;
    }
}
