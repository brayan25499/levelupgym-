namespace LevelUpGym.Api.DTOs;

public class ClassSessionDto
{
    public int IdClass { get; set; }
    public string Nombre { get; set; } = null!;
    public string Fecha { get; set; } = null!; // format: "18 de Agosto, 2026"
    public string Hora { get; set; } = null!; // format: "09:00 AM"
    public int CapacidadMaxima { get; set; }
    public int Inscritos { get; set; }
    public string Estado { get; set; } = null!;
    public EntrenadorBasicoDto Entrenador { get; set; } = null!;
    public bool Inscrito { get; set; } // indicates if the current user is enrolled
}

public class EntrenadorBasicoDto
{
    public int IdEmpleado { get; set; }
    public string NombreCompleto { get; set; } = null!;
}

public class CreateClassSessionDto
{
    public int IdEntrenador { get; set; }
    public string Nombre { get; set; } = null!;
    public string Fecha { get; set; } = null!; // format: "yyyy-MM-dd"
    public string HoraInicio { get; set; } = null!; // format: "HH:mm"
    public int CapacidadMaxima { get; set; }
}
