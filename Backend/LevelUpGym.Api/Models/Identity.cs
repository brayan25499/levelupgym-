using System.ComponentModel.DataAnnotations;

namespace LevelUpGym.Api.Models;

public abstract class BaseEntity
{
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class Profile : BaseEntity
{
    [Key]
    public int IdProfile { get; set; }
    
    [Required]
    [StringLength(2)]
    public string TipoDocumento { get; set; } = null!;
    
    [Required]
    [StringLength(20)]
    public string NumDocumento { get; set; } = null!;
    
    [Required]
    [StringLength(100)]
    public string Nombre { get; set; } = null!;
    
    [Required]
    [StringLength(100)]
    public string Apellidos { get; set; } = null!;
    
    [StringLength(9)]
    public string? Sexo { get; set; }
    
    [StringLength(20)]
    public string? Telefono { get; set; }

    public decimal? Peso { get; set; } // in kg
    public decimal? Estatura { get; set; } // in meters

    // Navigation
    public virtual Auth? Auth { get; set; }
    public virtual Client? Client { get; set; }
    public virtual Employee? Employee { get; set; }
}

public class Auth : BaseEntity
{
    [Key]
    public int IdAuth { get; set; }
    
    public int IdProfile { get; set; }
    
    [Required]
    [EmailAddress]
    [StringLength(100)]
    public string Email { get; set; } = null!;
    
    [Required]
    public byte[] Password { get; set; } = null!;
    
    [Required]
    public byte[] PasswordSalt { get; set; } = null!;
    
    [StringLength(20)]
    public string? Estado { get; set; }

    // Navigation
    public virtual Profile Profile { get; set; } = null!;
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

public class Client : BaseEntity
{
    [Key]
    public int IdCliente { get; set; }
    
    public int IdProfile { get; set; }
    
    [StringLength(20)]
    public string? Estado { get; set; }

    // Navigation
    public virtual Profile Profile { get; set; } = null!;
    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public virtual ICollection<Progress> ProgressReports { get; set; } = new List<Progress>();
    public virtual ICollection<Sale> Sales { get; set; } = new List<Sale>();
}

public class Employee : BaseEntity
{
    [Key]
    public int IdEmpleado { get; set; }
    
    public int IdProfile { get; set; }
    
    public int? IdEps { get; set; }
    
    public DateOnly? FechaContratacion { get; set; }
    
    public decimal? SalarioBase { get; set; }
    
    [StringLength(20)]
    public string? Estado { get; set; }

    // Navigation
    public virtual Profile Profile { get; set; } = null!;
    public virtual Eps? Eps { get; set; }
    public virtual ICollection<EmployeePayment> Payments { get; set; } = new List<EmployeePayment>();
}
