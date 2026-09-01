using System.ComponentModel.DataAnnotations;

namespace LevelUpGym.Api.Models;

public class GoalType : BaseEntity
{
    [Key]
    public int IdTipoObjetivo { get; set; }
    [Required]
    public int Orden { get; set; }
    
    [Required]
    [StringLength(50)]
    public string Nombre { get; set; } = null!;
    
    [StringLength(255)]
    public string? Descripcion { get; set; }
    
    [Required]
    [StringLength(10)]
    public string Unidad { get; set; } = null!;
    
    [Required]
    [StringLength(20)]
    public string TipoDato { get; set; } = "DECIMAL";
    
    [Required]
    [StringLength(10)]
    public string Direccion { get; set; } = null!; // "MENOR" or "MAYOR"
    
    public bool Activo { get; set; } = true;

    // Navigation
    public virtual ICollection<Goal> Goals { get; set; } = new List<Goal>();
}
