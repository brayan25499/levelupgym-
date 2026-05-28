using System.ComponentModel.DataAnnotations;

namespace LevelUpGym.Api.Models;

public class Item : BaseEntity
{
    [Key]
    public int IdItem { get; set; }
    
    [StringLength(20)]
    public string? Tipo { get; set; } // 'PRODUCTO' or 'MEMBRESIA'
    
    [StringLength(20)]
    public string? Estado { get; set; }

    // Navigation
    public virtual Product? Product { get; set; }
    public virtual Membership? Membership { get; set; }
    public virtual ICollection<SaleDetail> SaleDetails { get; set; } = new List<SaleDetail>();
}

public class Category : BaseEntity
{
    [Key]
    public int IdCategoria { get; set; }
    
    [StringLength(20)]
    public string? Nombre { get; set; }
    
    [StringLength(255)]
    public string? Descripcion { get; set; }
    
    [StringLength(20)]
    public string? Estado { get; set; }

    // Navigation
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Product : BaseEntity
{
    [Key]
    public int IdProducto { get; set; }
    
    public int? IdCategoria { get; set; }
    
    public int? IdItem { get; set; }
    
    [StringLength(150)]
    public string? Nombre { get; set; }
    
    public decimal? PrecioVenta { get; set; }
    
    [StringLength(255)]
    public string? Descripcion { get; set; }
    
    [StringLength(20)]
    public string? Estado { get; set; }

    // Navigation
    public virtual Category? Category { get; set; }
    public virtual Item? Item { get; set; }
    public virtual ICollection<PurchaseDetail> PurchaseDetails { get; set; } = new List<PurchaseDetail>();
}

public class Membership : BaseEntity
{
    [Key]
    public int IdMembresia { get; set; }
    
    public int? IdItem { get; set; }
    
    [StringLength(100)]
    public string? Nombre { get; set; }
    
    [StringLength(255)]
    public string? Descripcion { get; set; }
    
    public decimal? Precio { get; set; }
    
    [StringLength(20)]
    public string? Estado { get; set; }

    // Navigation
    public virtual Item? Item { get; set; }
    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}

public class Provider : BaseEntity
{
    [Key]
    public int IdProveedor { get; set; }
    
    [StringLength(150)]
    public string? Nombre { get; set; }
    
    [StringLength(20)]
    public string? Telefono { get; set; }
    
    [StringLength(150)]
    public string? Email { get; set; }
    
    [StringLength(200)]
    public string? Direccion { get; set; }
    
    [StringLength(20)]
    public string? Estado { get; set; }

    // Navigation
    public virtual ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
}
