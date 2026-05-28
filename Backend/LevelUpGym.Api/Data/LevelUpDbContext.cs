using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Models;

namespace LevelUpGym.Api.Data;

public class LevelUpDbContext : DbContext
{
    public LevelUpDbContext(DbContextOptions<LevelUpDbContext> options) : base(options)
    {
    }

    public DbSet<Profile> Profiles { get; set; }
    public DbSet<Auth> Auths { get; set; }
    public DbSet<Client> Clients { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<Eps> EpsList { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Item> Items { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Membership> Memberships { get; set; }
    public DbSet<Subscription> Subscriptions { get; set; }
    public DbSet<SubscriptionStatus> SubscriptionStatuses { get; set; }
    public DbSet<Sale> Sales { get; set; }
    public DbSet<SaleDetail> SaleDetails { get; set; }
    public DbSet<Purchase> Purchases { get; set; }
    public DbSet<PurchaseDetail> PurchaseDetails { get; set; }
    public DbSet<Provider> Providers { get; set; }
    public DbSet<PaymentMethod> PaymentMethods { get; set; }
    public DbSet<CashMovement> CashMovements { get; set; }
    public DbSet<Progress> ProgressReports { get; set; }
    public DbSet<EmployeePayment> EmployeePayments { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<Cart> Carts { get; set; }
    public DbSet<CartItem> CartItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Profiles Table
        modelBuilder.Entity<Profile>(entity =>
        {
            entity.ToTable("profiles");
            entity.HasKey(e => e.IdProfile);
            entity.HasIndex(e => e.NumDocumento).IsUnique();
        });

        // Auth Table
        modelBuilder.Entity<Auth>(entity =>
        {
            entity.ToTable("auth");
            entity.HasKey(e => e.IdAuth);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.IdProfile).IsUnique();

            entity.HasOne(d => d.Profile)
                .WithOne(p => p.Auth)
                .HasForeignKey<Auth>(d => d.IdProfile);
        });

        // Clients Table
        modelBuilder.Entity<Client>(entity =>
        {
            entity.ToTable("clientes");
            entity.HasKey(e => e.IdCliente);
            entity.HasIndex(e => e.IdProfile).IsUnique();

            entity.HasOne(d => d.Profile)
                .WithOne(p => p.Client)
                .HasForeignKey<Client>(d => d.IdProfile);
        });

        // Employees Table
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("empleados");
            entity.HasKey(e => e.IdEmpleado);
            entity.HasIndex(e => e.IdProfile).IsUnique();

            entity.HasOne(d => d.Profile)
                .WithOne(p => p.Employee)
                .HasForeignKey<Employee>(d => d.IdProfile);

            entity.HasOne(d => d.Eps)
                .WithMany(p => p.Employees)
                .HasForeignKey(d => d.IdEps);
        });

        // Items Table
        modelBuilder.Entity<Item>(entity =>
        {
            entity.ToTable("items");
            entity.HasKey(e => e.IdItem);
        });

        // Products Table
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("productos");
            entity.HasKey(e => e.IdProducto);
            entity.HasIndex(e => e.Nombre).IsUnique();

            entity.HasOne(d => d.Category)
                .WithMany(p => p.Products)
                .HasForeignKey(d => d.IdCategoria);

            entity.HasOne(d => d.Item)
                .WithOne(p => p.Product)
                .HasForeignKey<Product>(d => d.IdItem);
        });

        // Memberships Table
        modelBuilder.Entity<Membership>(entity =>
        {
            entity.ToTable("membresias");
            entity.HasKey(e => e.IdMembresia);
            entity.HasIndex(e => e.Nombre).IsUnique();

            entity.HasOne(d => d.Item)
                .WithOne(p => p.Membership)
                .HasForeignKey<Membership>(d => d.IdItem);
        });

        // Subscriptions Table
        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.ToTable("suscripciones");
            entity.HasKey(e => e.IdSuscripcion);

            entity.HasOne(d => d.Client)
                .WithMany(p => p.Subscriptions)
                .HasForeignKey(d => d.IdCliente);

            entity.HasOne(d => d.Membership)
                .WithMany(p => p.Subscriptions)
                .HasForeignKey(d => d.IdMembresia);

            entity.HasOne(d => d.Status)
                .WithMany(p => p.Subscriptions)
                .HasForeignKey(d => d.IdEstado);
        });

        // Sales Table
        modelBuilder.Entity<Sale>(entity =>
        {
            entity.ToTable("ventas");
            entity.HasKey(e => e.IdVenta);

            entity.HasOne(d => d.Client)
                .WithMany(p => p.Sales)
                .HasForeignKey(d => d.IdCliente);

            entity.HasOne(d => d.PaymentMethodNavigation)
                .WithMany(p => p.Sales)
                .HasForeignKey(d => d.MetodoPago);
        });

        // Purchases Table
        modelBuilder.Entity<Purchase>(entity =>
        {
            entity.ToTable("compras");
            entity.HasKey(e => e.IdCompra);

            entity.HasOne(d => d.Provider)
                .WithMany(p => p.Purchases)
                .HasForeignKey(d => d.IdProveedor);

            entity.HasOne(d => d.PaymentMethodNavigation)
                .WithMany(p => p.Purchases)
                .HasForeignKey(d => d.MetodoPago);
        });

        // Decimal Precision
        modelBuilder.Entity<SaleDetail>()
            .Property(p => p.PrecioUnitario)
            .HasPrecision(18, 2);
        
        modelBuilder.Entity<SaleDetail>()
            .Property(p => p.SubTotal)
            .HasPrecision(18, 2);

        modelBuilder.Entity<PurchaseDetail>()
            .Property(p => p.PrecioUnitario)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Employee>()
            .Property(p => p.SalarioBase)
            .HasPrecision(18, 2);

        // ... Add more mappings as needed based on the schema ...
        // Group Role/Permission
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.ToTable("roles_permisos");
            entity.HasIndex(e => new { e.IdRol, e.IdPermiso }).IsUnique();
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("usuarios_roles");
            entity.HasIndex(e => new { e.IdAuth, e.IdRol }).IsUnique();
        });

        // Cart Configuration
        modelBuilder.Entity<Cart>(entity =>
        {
            entity.ToTable("carritos");
            entity.HasKey(e => e.IdCarrito);
            entity.HasOne(c => c.Client)
                .WithMany()
                .HasForeignKey(c => c.IdCliente);
        });

        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.ToTable("carrito_items");
            entity.HasKey(e => e.IdCartItem);
            entity.HasOne(ci => ci.Cart)
                .WithMany(c => c.Items)
                .HasForeignKey(ci => ci.IdCarrito);
            entity.HasOne(ci => ci.Product)
                .WithMany()
                .HasForeignKey(ci => ci.IdProducto);
        });
    }
}
