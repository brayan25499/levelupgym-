namespace LevelUpGym.Api.DTOs;

public class CreateGoalTypeDto
{
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }
    public string Unidad { get; set; } = null!;
    public string TipoDato { get; set; } = "DECIMAL";
    public string Direccion { get; set; } = "MENOR"; // "MENOR" or "MAYOR"
    public bool Activo { get; set; } = true;
}

public class UpdateGoalTypeDto
{
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }
    public string Unidad { get; set; } = null!;
    public string TipoDato { get; set; } = "DECIMAL";
    public string Direccion { get; set; } = "MENOR"; // "MENOR" or "MAYOR"
    public bool Activo { get; set; } = true;
}
