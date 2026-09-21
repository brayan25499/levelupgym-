using System.ComponentModel.DataAnnotations;

namespace LevelUpGym.Api.DTOs;

public class ContactMessageRequest
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(150)]
    public string Nombre { get; set; } = null!;

    [Required(ErrorMessage = "El correo es obligatorio.")]
    [EmailAddress(ErrorMessage = "El formato del correo no es válido.")]
    [StringLength(200)]
    public string Correo { get; set; } = null!;

    [Required(ErrorMessage = "El asunto es obligatorio.")]
    [StringLength(100)]
    public string Asunto { get; set; } = null!;

    [Required(ErrorMessage = "El mensaje es obligatorio.")]
    [StringLength(2000)]
    public string Mensaje { get; set; } = null!;
}
