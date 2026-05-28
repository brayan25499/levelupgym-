using System.ComponentModel.DataAnnotations;

namespace LevelUpGym.Api.Models;

public class Eps : BaseEntity
{
    [Key]
    public int IdEps { get; set; }
    
    [Required]
    [StringLength(150)]
    public string Nombre { get; set; } = null!;

    // Navigation
    public virtual ICollection<Employee> Employees { get; set; } = new List<Employee>();
}

public class SubscriptionStatus : BaseEntity
{
    [Key]
    public int IdEstado { get; set; }
    
    [Required]
    [StringLength(50)]
    public string Concepto { get; set; } = null!;

    // Navigation
    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}

public class PaymentMethod : BaseEntity
{
    [Key]
    public int IdPago { get; set; }
    
    [StringLength(50)]
    public string? Nombre { get; set; }

    // Navigation
    public virtual ICollection<Sale> Sales { get; set; } = new List<Sale>();
    public virtual ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
}

public class EmployeePayment : BaseEntity
{
    [Key]
    public int IdPago { get; set; }
    
    public int IdEmpleado { get; set; }
    
    public decimal Monto { get; set; }
    
    public DateOnly FechaPago { get; set; }
    
    [StringLength(255)]
    public string? Descripcion { get; set; }

    // Navigation
    public virtual Employee Employee { get; set; } = null!;
}

public class Progress : BaseEntity
{
    [Key]
    public int IdProgreso { get; set; }
    
    public int IdCliente { get; set; }
    
    public decimal? Peso { get; set; }
    
    [StringLength(4)]
    public string? Altura { get; set; }
    
    [StringLength(3)]
    public string? Imc { get; set; }
    
    public DateOnly? FechaMedicion { get; set; }

    // Navigation
    public virtual Client Client { get; set; } = null!;
}

public class Permission : BaseEntity
{
    [Key]
    public int IdPermiso { get; set; }
    
    [StringLength(100)]
    public string? Nombre { get; set; }

    // Navigation
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class Role : BaseEntity
{
    [Key]
    public int IdRol { get; set; }
    
    [StringLength(50)]
    public string? Nombre { get; set; }
    
    [StringLength(255)]
    public string? Descripcion { get; set; }

    // Navigation
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

public class RolePermission : BaseEntity
{
    [Key]
    public int Id { get; set; }
    
    public int? IdRol { get; set; }
    
    public int? IdPermiso { get; set; }

    // Navigation
    public virtual Role? Role { get; set; }
    public virtual Permission? Permission { get; set; }
}

public class UserRole : BaseEntity
{
    [Key]
    public int Id { get; set; }
    
    public int? IdAuth { get; set; }
    
    public int? IdRol { get; set; }

    // Navigation
    public virtual Auth? Auth { get; set; }
    public virtual Role? Role { get; set; }
}
