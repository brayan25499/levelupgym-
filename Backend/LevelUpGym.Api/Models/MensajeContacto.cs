using System.ComponentModel.DataAnnotations;

namespace LevelUpGym.Api.Models;

public class MensajeContacto : BaseEntity
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(150)]
    public string Nombre { get; set; } = null!;

    [Required]
    [EmailAddress]
    [StringLength(200)]
    public string Correo { get; set; } = null!;

    [Required]
    [StringLength(100)]
    public string Asunto { get; set; } = null!;

    [Required]
    [StringLength(2000)]
    public string Mensaje { get; set; } = null!;

    public DateTime FechaEnvio { get; set; } = DateTime.UtcNow;

    [Required]
    [StringLength(30)]
    public string Estado { get; set; } = "Pendiente";
}
