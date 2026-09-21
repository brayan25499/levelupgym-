namespace LevelUpGym.Api.DTOs;

public class CreateProgressDto
{
    public decimal Peso { get; set; }
    public decimal Altura { get; set; }
    public decimal? Cintura { get; set; }
    public decimal? Pecho { get; set; }
    public decimal? Brazo { get; set; }
    public decimal? Pierna { get; set; }
    public DateOnly? FechaMedicion { get; set; }
}

public class UpdateProgressDto
{
    public decimal Peso { get; set; }
    public decimal Altura { get; set; }
    public decimal? Cintura { get; set; }
    public decimal? Pecho { get; set; }
    public decimal? Brazo { get; set; }
    public decimal? Pierna { get; set; }
    public DateOnly? FechaMedicion { get; set; }
}

public class ProgressDto
{
    public int IdProgreso { get; set; }
    public int IdCliente { get; set; }
    public decimal? Peso { get; set; }
    public string? Altura { get; set; }
    public string? Imc { get; set; }
    public decimal? Cintura { get; set; }
    public decimal? Pecho { get; set; }
    public decimal? Brazo { get; set; }
    public decimal? Pierna { get; set; }
    public DateOnly? FechaMedicion { get; set; }
    public DateTime? CreatedAt { get; set; }
}
