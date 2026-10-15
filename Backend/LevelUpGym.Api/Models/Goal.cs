using System.ComponentModel.DataAnnotations;

namespace LevelUpGym.Api.Models;

public class Goal : BaseEntity
{
    [Key]
    public int IdObjetivo { get; set; }

    public int IdCliente { get; set; }

    public int IdTipoObjetivo { get; set; }

    public decimal ValorMeta { get; set; }

    public DateOnly FechaInicio { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public DateOnly? FechaLimite { get; set; }

    [Required]
    [StringLength(20)]
    public string Estado { get; set; } = "EN_PROGRESO"; // "EN_PROGRESO", "COMPLETADO", "VENCIDO", "CANCELADO"

    [StringLength(255)]
    public string? Descripcion { get; set; }

    // Navigation Properties
    public virtual Client Client { get; set; } = null!;
    public virtual GoalType GoalType { get; set; } = null!;
}
