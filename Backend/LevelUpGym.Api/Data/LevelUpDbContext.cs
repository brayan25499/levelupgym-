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

    public DbSet<Membership> Memberships { get; set; }
    public DbSet<Subscription> Subscriptions { get; set; }
    public DbSet<SubscriptionStatus> SubscriptionStatuses { get; set; }
    public DbSet<CashMovement> CashMovements { get; set; }
    public DbSet<Progress> ProgressReports { get; set; }
    public DbSet<EmployeePayment> EmployeePayments { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<RolGimnasio> RolesGimnasio { get; set; }
    public DbSet<EmpleadoRolGimnasio> EmpleadoRolesGimnasio { get; set; }
    public DbSet<MensajeContacto> MensajesContacto { get; set; }
    public DbSet<ClassSession> ClassSessions { get; set; }
    public DbSet<ClassEnrollment> ClassEnrollments { get; set; }
    public DbSet<GoalType> GoalTypes { get; set; }
    public DbSet<Goal> Goals { get; set; }
    public DbSet<Venta> Ventas { get; set; }
    public DbSet<VentaDetalle> VentaDetalles { get; set; }
    public DbSet<Pago> Pagos { get; set; }
    public DbSet<CambioSuscripcion> CambiosSuscripcion { get; set; }

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

        // Progress Table
        modelBuilder.Entity<Progress>(entity =>
        {
            entity.ToTable("ProgressReports");
            entity.HasKey(e => e.IdProgreso);
            entity.Property(e => e.Imc).HasMaxLength(20);
            entity.Property(e => e.Altura).HasMaxLength(20);

            entity.HasOne(d => d.Client)
                .WithMany(p => p.ProgressReports)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.Cascade);
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

        // Memberships Table
        modelBuilder.Entity<Membership>(entity =>
        {
            entity.ToTable("membresias");
            entity.HasKey(e => e.IdMembresia);
            entity.HasIndex(e => e.Nombre).IsUnique();
        });

        // Subscriptions Table
        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.ToTable("suscripciones");
            entity.HasKey(e => e.IdSuscripcion);
            entity.Property(e => e.Precio).HasPrecision(18, 2);

            entity.HasOne(d => d.Client)
                .WithMany(p => p.Subscriptions)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Membership)
                .WithMany(p => p.Subscriptions)
                .HasForeignKey(d => d.IdMembresia)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Status)
                .WithMany(p => p.Subscriptions)
                .HasForeignKey(d => d.IdEstado)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Venta)
                .WithMany()
                .HasForeignKey(d => d.IdVenta)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.SuscripcionAnterior)
                .WithMany()
                .HasForeignKey(d => d.IdSuscripcionAnterior)
                .OnDelete(DeleteBehavior.Restrict);

            // Índice único filtrado: Un cliente solo puede tener UNA suscripción activa a la vez
            entity.HasIndex(e => e.IdCliente)
                .HasDatabaseName("IX_suscripciones_ClienteActiva")
                .IsUnique()
                .HasFilter("[IdEstado] = 1 AND [DeletedAt] IS NULL");
        });

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

        // RolesGimnasio Table (roles funcionales del gimnasio)
        modelBuilder.Entity<RolGimnasio>(entity =>
        {
            entity.ToTable("roles_gimnasio");
            entity.HasKey(e => e.IdRolGym);
            entity.HasIndex(e => e.Nombre).IsUnique();
        });

        // EmpleadoRolGimnasio Table (tabla intermedia empleados <-> roles gimnasio)
        modelBuilder.Entity<EmpleadoRolGimnasio>(entity =>
        {
            entity.ToTable("roles_empleados");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.IdEmpleado, e.IdRolGym }).IsUnique();

            entity.HasOne(d => d.Employee)
                .WithMany(p => p.EmpleadoRoles)
                .HasForeignKey(d => d.IdEmpleado);

            entity.HasOne(d => d.RolGimnasio)
                .WithMany(p => p.EmpleadoRoles)
                .HasForeignKey(d => d.IdRolGym);
        });

        modelBuilder.Entity<MensajeContacto>(entity =>
        {
            entity.ToTable("mensajes_contacto");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Estado).HasDefaultValue("Pendiente");
            entity.Property(e => e.FechaEnvio).HasDefaultValueSql("GETUTCDATE()");
        });

        // ClassSessions Table
        modelBuilder.Entity<ClassSession>(entity =>
        {
            entity.ToTable("class_sessions");
            entity.HasKey(e => e.IdClass);
            
            entity.HasOne(d => d.Entrenador)
                .WithMany()
                .HasForeignKey(d => d.IdEntrenador)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ClassEnrollment Table
        modelBuilder.Entity<ClassEnrollment>(entity =>
        {
            entity.ToTable("class_enrollments");
            entity.HasKey(e => e.IdEnrollment);
            
            // Un cliente solo puede inscribirse una vez en una misma clase
            entity.HasIndex(e => new { e.IdClass, e.IdCliente }).IsUnique();

            entity.HasOne(d => d.ClassSession)
                .WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.IdClass)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Client)
                .WithMany()
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // GoalTypes Table & Seed Data
        modelBuilder.Entity<GoalType>(entity =>
        {
            entity.ToTable("GoalTypes");
            entity.HasKey(e => e.IdTipoObjetivo);
            entity.HasIndex(e => new { e.Nombre, e.Direccion }).IsUnique().HasFilter("[DeletedAt] IS NULL");

            entity.HasData(
                new GoalType { IdTipoObjetivo = 1, Nombre = "Peso", Descripcion = "Alcanzar un peso corporal determinado.", Unidad = "kg", TipoDato = "DECIMAL", Direccion = "MENOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 2, Nombre = "IMC", Descripcion = "Alcanzar un índice de masa corporal determinado.", Unidad = "-", TipoDato = "DECIMAL", Direccion = "MENOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 3, Nombre = "Cintura", Descripcion = "Reducir la medida de cintura.", Unidad = "cm", TipoDato = "DECIMAL", Direccion = "MENOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 4, Nombre = "Pecho", Descripcion = "Aumentar la medida de pecho.", Unidad = "cm", TipoDato = "DECIMAL", Direccion = "MAYOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 5, Nombre = "Brazo", Descripcion = "Aumentar la medida de brazo.", Unidad = "cm", TipoDato = "DECIMAL", Direccion = "MAYOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 6, Nombre = "Pierna", Descripcion = "Aumentar la medida de pierna.", Unidad = "cm", TipoDato = "DECIMAL", Direccion = "MAYOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
            );
        });

        // Goals Table
        modelBuilder.Entity<Goal>(entity =>
        {
            entity.ToTable("Goals");
            entity.HasKey(e => e.IdObjetivo);
            entity.Property(e => e.ValorMeta).HasPrecision(18, 2);

            entity.HasOne(d => d.Client)
                .WithMany(p => p.Goals)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.GoalType)
                .WithMany(p => p.Goals)
                .HasForeignKey(d => d.IdTipoObjetivo)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Ventas Table
        modelBuilder.Entity<Venta>(entity =>
        {
            entity.ToTable("ventas");
            entity.HasKey(e => e.IdVenta);
            entity.Property(e => e.Subtotal).HasPrecision(18, 2);
            entity.Property(e => e.Descuento).HasPrecision(18, 2);
            entity.Property(e => e.Total).HasPrecision(18, 2);

            entity.HasOne(d => d.Client)
                .WithMany(p => p.Ventas)
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // VentaDetalles Table
        modelBuilder.Entity<VentaDetalle>(entity =>
        {
            entity.ToTable("venta_detalles");
            entity.HasKey(e => e.IdVentaDetalle);
            entity.Property(e => e.PrecioUnitario).HasPrecision(18, 2);
            entity.Property(e => e.Descuento).HasPrecision(18, 2);
            entity.Property(e => e.Subtotal).HasPrecision(18, 2);

            entity.HasOne(d => d.Venta)
                .WithMany(p => p.Detalles)
                .HasForeignKey(d => d.IdVenta)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Membership)
                .WithMany(p => p.VentaDetalles)
                .HasForeignKey(d => d.IdMembresia)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Pagos Table
        modelBuilder.Entity<Pago>(entity =>
        {
            entity.ToTable("pagos");
            entity.HasKey(e => e.IdPago);
            entity.Property(e => e.Monto).HasPrecision(18, 2);

            entity.HasIndex(e => e.ReferenciaExterna)
                .IsUnique()
                .HasFilter("[ReferenciaExterna] IS NOT NULL");

            entity.HasOne(d => d.Venta)
                .WithMany(p => p.Pagos)
                .HasForeignKey(d => d.IdVenta)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // CambiosSuscripcion Table
        modelBuilder.Entity<CambioSuscripcion>(entity =>
        {
            entity.ToTable("cambios_suscripcion");
            entity.HasKey(e => e.IdCambioSuscripcion);
            entity.Property(e => e.PrecioAnterior).HasPrecision(18, 2);
            entity.Property(e => e.PrecioNuevo).HasPrecision(18, 2);
            entity.Property(e => e.CreditoAplicado).HasPrecision(18, 2);
            entity.Property(e => e.ValorAdicional).HasPrecision(18, 2);
            entity.Property(e => e.ValorDevuelto).HasPrecision(18, 2);

            entity.HasOne(d => d.Client)
                .WithMany()
                .HasForeignKey(d => d.IdCliente)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.SuscripcionAnterior)
                .WithMany()
                .HasForeignKey(d => d.IdSuscripcionAnterior)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.SuscripcionNueva)
                .WithMany()
                .HasForeignKey(d => d.IdSuscripcionNueva)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Venta)
                .WithMany()
                .HasForeignKey(d => d.IdVenta)
                .OnDelete(DeleteBehavior.Restrict);
        });

    }
}
