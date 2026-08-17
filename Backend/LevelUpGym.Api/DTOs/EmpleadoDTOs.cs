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
