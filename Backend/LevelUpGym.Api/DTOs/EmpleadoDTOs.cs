namespace LevelUpGym.Api.DTOs;

public class EntrenadorDto
{
    public int IdEmpleado { get; set; }
    public string Nombre { get; set; } = null!;
    public string Apellidos { get; set; } = null!;
    public string Iniciales { get; set; } = null!;
    public string? Especialidad { get; set; }
    public string? Descripcion { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class EntrenadorAdminDto
{
    public int IdEmpleado { get; set; }
    public string Nombre { get; set; } = null!;
    public string Apellidos { get; set; } = null!;
    public string? Especialidad { get; set; }
    public string? Descripcion { get; set; }
    public decimal? SalarioBase { get; set; }
    public string? FechaContratacion { get; set; } // yyyy-MM-dd
    public string? Estado { get; set; }
}

public class CreateEntrenadorDto
{
    public string Nombre { get; set; } = null!;
    public string Apellidos { get; set; } = null!;
    public string? Especialidad { get; set; }
    public string? Descripcion { get; set; }
    public decimal? SalarioBase { get; set; }
    public string? FechaContratacion { get; set; } // yyyy-MM-dd
}

public class UpdateEntrenadorDto
{
    public string Nombre { get; set; } = null!;
    public string Apellidos { get; set; } = null!;
    public string? Especialidad { get; set; }
    public string? Descripcion { get; set; }
    public decimal? SalarioBase { get; set; }
    public string? FechaContratacion { get; set; } // yyyy-MM-dd
    public string? Estado { get; set; }
}

