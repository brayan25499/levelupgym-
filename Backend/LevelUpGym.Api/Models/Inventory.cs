using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LevelUpGym.Api.Models;

public class Membership : BaseEntity
{
    [Key]
    public int IdMembresia { get; set; }
    
    [StringLength(100)]
    public string? Nombre { get; set; }
    
    [StringLength(255)]
    public string? Descripcion { get; set; }
    
    public decimal? Precio { get; set; }
    
    [StringLength(20)]
    public string? Estado { get; set; }

    // Navigation
    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public virtual ICollection<VentaDetalle> VentaDetalles { get; set; } = new List<VentaDetalle>();
}

