using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LevelUpGym.Api.Models;

public class ClassSession : BaseEntity
{
    [Key]
    public int IdClass { get; set; }
    
    public int IdEntrenador { get; set; }
    
    [Required]
    [StringLength(150)]
    public string Nombre { get; set; } = null!;
    
    public DateOnly Fecha { get; set; }
    
    public TimeSpan HoraInicio { get; set; }
    
    public int CapacidadMaxima { get; set; }
    
    [Required]
    [StringLength(20)]
    public string Estado { get; set; } = "Programada"; // Programada, Completada, Cancelada

    // Navigation properties
    public virtual Employee Entrenador { get; set; } = null!;
    public virtual ICollection<ClassEnrollment> Enrollments { get; set; } = new List<ClassEnrollment>();
}

public class ClassEnrollment : BaseEntity
{
    [Key]
    public int IdEnrollment { get; set; }
    
    public int IdClass { get; set; }
    
    public int IdCliente { get; set; }
    
    // Navigation properties
    public virtual ClassSession ClassSession { get; set; } = null!;
    public virtual Client Client { get; set; } = null!;
}
