using System.ComponentModel.DataAnnotations;

namespace LevelUpGym.Api.Models;

/// <summary>
/// Roles funcionales/laborales del gimnasio (ej: Head Coach, Nutricionista).
/// Separado de la tabla 'roles' que se usa para autorización del sistema.
/// </summary>
public class RolGimnasio : BaseEntity
{
    [Key]
    public int IdRolGym { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Nombre { get; set; } = null!;
    
    [StringLength(255)]
    public string? Descripcion { get; set; }

    // Navigation
    public virtual ICollection<EmpleadoRolGimnasio> EmpleadoRoles { get; set; } = new List<EmpleadoRolGimnasio>();
}

/// <summary>
/// Tabla intermedia muchos-a-muchos entre Empleados y RolesGimnasio.
/// Un empleado puede tener múltiples roles funcionales.
/// </summary>
public class EmpleadoRolGimnasio : BaseEntity
{
    [Key]
    public int Id { get; set; }
    
    public int IdEmpleado { get; set; }
    
    public int IdRolGym { get; set; }

    // Navigation
    public virtual Employee Employee { get; set; } = null!;
    public virtual RolGimnasio RolGimnasio { get; set; } = null!;
}
