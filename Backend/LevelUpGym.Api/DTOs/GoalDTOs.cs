namespace LevelUpGym.Api.DTOs;

public class CreateGoalDto
{
    public int IdTipoObjetivo { get; set; }
    public decimal ValorMeta { get; set; }
    public DateOnly? FechaLimite { get; set; }
    public string? Descripcion { get; set; }
}

public class GoalResponseDto
{
    public int IdObjetivo { get; set; }
    public int IdCliente { get; set; }
    public int IdTipoObjetivo { get; set; }
    public string NombreTipoObjetivo { get; set; } = null!;
    public string Unidad { get; set; } = null!;
    public string Direccion { get; set; } = null!;
    public decimal ValorMeta { get; set; }
    public decimal? ValorInicial { get; set; }
    public decimal? ValorActual { get; set; }
    public double PorcentajeProgreso { get; set; }
    public DateOnly FechaInicio { get; set; }
    public DateOnly? FechaLimite { get; set; }
    public string Estado { get; set; } = null!;
    public string? Descripcion { get; set; }
    public DateTime? CreatedAt { get; set; }
}
