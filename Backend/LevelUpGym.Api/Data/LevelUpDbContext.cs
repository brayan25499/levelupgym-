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
    public DbSet<Item> Items { get; set; }
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
            entity.HasIndex(e => e.Nombre).IsUnique();

            entity.HasData(
                new GoalType { IdTipoObjetivo = 1, Nombre = "Peso", Descripcion = "Alcanzar un peso corporal determinado.", Unidad = "kg", TipoDato = "DECIMAL", Direccion = "MENOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 2, Nombre = "IMC", Descripcion = "Alcanzar un índice de masa corporal determinado.", Unidad = "-", TipoDato = "DECIMAL", Direccion = "MENOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 3, Nombre = "Cintura", Descripcion = "Reducir la medida de cintura.", Unidad = "cm", TipoDato = "DECIMAL", Direccion = "MENOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 4, Nombre = "Pecho", Descripcion = "Aumentar la medida de pecho.", Unidad = "cm", TipoDato = "DECIMAL", Direccion = "MAYOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 5, Nombre = "Brazo", Descripcion = "Aumentar la medida de brazo.", Unidad = "cm", TipoDato = "DECIMAL", Direccion = "MAYOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 6, Nombre = "Pierna", Descripcion = "Aumentar la medida de pierna.", Unidad = "cm", TipoDato = "DECIMAL", Direccion = "MAYOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new GoalType { IdTipoObjetivo = 7, Nombre = "Porcentaje de grasa", Descripcion = "Reducir el porcentaje de grasa corporal.", Unidad = "%", TipoDato = "DECIMAL", Direccion = "MENOR", Activo = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
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

    }
}
