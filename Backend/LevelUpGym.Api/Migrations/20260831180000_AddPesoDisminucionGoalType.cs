using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPesoDisminucionGoalType : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Insert Peso - Disminución if it does not already exist.
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM GoalTypes WHERE Nombre = 'Peso' AND Direccion = 'MENOR')
                BEGIN
                    INSERT INTO GoalTypes (Nombre, Descripcion, Unidad, TipoDato, Direccion, Activo, CreatedAt)
                    VALUES ('Peso', 'Reducir el peso corporal.', 'kg', 'DECIMAL', 'MENOR', 1, GETUTCDATE());
                END
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove the inserted record (only if it matches the exact description we added).
            migrationBuilder.Sql(@"DELETE FROM GoalTypes WHERE Nombre = 'Peso' AND Direccion = 'MENOR' AND Descripcion = 'Reducir el peso corporal.'");
        }
    }
}
