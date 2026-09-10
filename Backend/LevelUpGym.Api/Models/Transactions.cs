using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LevelUpGym.Api.Models;

public class Venta : BaseEntity
{
    [Key]
    public int IdVenta { get; set; }
    
    public int IdCliente { get; set; }
    
    [Required]
    [StringLength(30)]
    public string TipoVenta { get; set; } = null!; // 'NUEVA_MEMBRESIA', 'RENOVACION', 'CAMBIO_MEMBRESIA'
    
    public decimal Subtotal { get; set; }
    
    public decimal Descuento { get; set; }
    
    public decimal Total { get; set; }
    
    [Required]
    [StringLength(20)]
    public string Estado { get; set; } = "PENDIENTE"; // 'PENDIENTE', 'PAGADA', 'CANCELADA', 'ANULADA'

    // Navigation
    public virtual Client Client { get; set; } = null!;
    public virtual ICollection<VentaDetalle> Detalles { get; set; } = new List<VentaDetalle>();
    public virtual ICollection<Pago> Pagos { get; set; } = new List<Pago>();
}

public class VentaDetalle : BaseEntity
{
    [Key]
    public int IdVentaDetalle { get; set; }
    
    public int IdVenta { get; set; }
    
    public int IdMembresia { get; set; }
    
    [StringLength(255)]
    public string? Descripcion { get; set; }
    
    public int Cantidad { get; set; }
    
    public decimal PrecioUnitario { get; set; }
    
    public decimal Descuento { get; set; }
    
    public decimal Subtotal { get; set; }

    // Navigation
    public virtual Venta Venta { get; set; } = null!;
    public virtual Membership Membership { get; set; } = null!;
}

public class Pago : BaseEntity
{
    [Key]
    public int IdPago { get; set; }
    
    public int IdVenta { get; set; }
    
    [Required]
    [StringLength(20)]
    public string MetodoPago { get; set; } = null!; // 'PSE', 'TARJETA', 'EFECTIVO', 'TRANSFERENCIA'
    
    [StringLength(100)]
    public string? Proveedor { get; set; }
    
    [StringLength(100)]
    public string? ReferenciaExterna { get; set; }
    
    public decimal Monto { get; set; }
    
    [Required]
    [StringLength(20)]
    public string Estado { get; set; } = "PENDIENTE"; // 'PENDIENTE', 'PROCESANDO', 'APROBADO', 'RECHAZADO', 'CANCELADO', 'REEMBOLSADO'
    
    public DateTime? FechaPago { get; set; }
    
    public string? Metadata { get; set; } // JSON — nvarchar(max) en SQL Server

    // Navigation
    public virtual Venta Venta { get; set; } = null!;
}

public class CambioSuscripcion : BaseEntity
{
    [Key]
    public int IdCambioSuscripcion { get; set; }
    
    public int IdCliente { get; set; }
    
    public int IdSuscripcionAnterior { get; set; }
    
    public int IdSuscripcionNueva { get; set; }
    
    public int? IdVenta { get; set; }
    
    public decimal PrecioAnterior { get; set; }
    
    public decimal PrecioNuevo { get; set; }
    
    public decimal CreditoAplicado { get; set; }
    
    public decimal ValorAdicional { get; set; }
    
    public decimal ValorDevuelto { get; set; }
    
    [StringLength(500)]
    public string? Motivo { get; set; }

    // Navigation
    public virtual Client Client { get; set; } = null!;
    public virtual Subscription SuscripcionAnterior { get; set; } = null!;
    public virtual Subscription SuscripcionNueva { get; set; } = null!;
    public virtual Venta? Venta { get; set; }
}

public class Subscription : BaseEntity
{
    [Key]
    public int IdSuscripcion { get; set; }
    
    public int IdCliente { get; set; }
    
    public int IdMembresia { get; set; }
    
    public int IdEstado { get; set; }
    
    public int? IdVenta { get; set; }
    
    public int? IdSuscripcionAnterior { get; set; }
    
    public decimal Precio { get; set; }
    
    public DateOnly FechaInicio { get; set; }
    
    public DateOnly FechaFin { get; set; }

    // Navigation
    public virtual Client Client { get; set; } = null!;
    public virtual Membership Membership { get; set; } = null!;
    public virtual SubscriptionStatus Status { get; set; } = null!;
    public virtual Venta? Venta { get; set; }
    public virtual Subscription? SuscripcionAnterior { get; set; }
}

public class CashMovement : BaseEntity
{
    [Key]
    public int IdMovimiento { get; set; }
    
    [Required]
    [StringLength(20)]
    public string Tipo { get; set; } = null!; // 'INGRESO' or 'EGRESO'
    
    public decimal Monto { get; set; }
    
    public DateTime? Fecha { get; set; }
    
    [StringLength(255)]
    public string? Descripcion { get; set; }
}

