using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrdenAndMissingPesoDisminucion : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1️⃣ Add column Orden (nullable int for legacy rows)
            migrationBuilder.AddColumn<int>(
                name: "Orden",
                table: "GoalTypes",
                type: "int",
                nullable: true);

            // 2️⃣ Ensure Peso — Disminución exists (insert if missing)
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM GoalTypes WHERE Nombre = 'Peso' AND Direccion = 'MENOR')
                BEGIN
                    INSERT INTO GoalTypes (Nombre, Descripcion, Unidad, TipoDato, Direccion, Activo, CreatedAt, Orden)
                    VALUES ('Peso', 'Reducir el peso corporal.', 'kg', 'DECIMAL', 'MENOR', 1, GETUTCDATE(), 2);
                END
            ");

            // 3️⃣ Update description for Peso — Disminución (in case it already existed with a different text)
            migrationBuilder.Sql(@"UPDATE GoalTypes SET Descripcion = 'Reducir el peso corporal.' WHERE Nombre = 'Peso' AND Direccion = 'MENOR';");

            // 4️⃣ Assign Orden values according to the required ordering
            migrationBuilder.Sql(@"
                UPDATE GoalTypes SET Orden = CASE
                    WHEN Nombre = 'Peso'    AND Direccion = 'MAYOR' THEN 1
                    WHEN Nombre = 'Peso'    AND Direccion = 'MENOR' THEN 2
                    WHEN Nombre = 'IMC'     AND Direccion = 'MAYOR' THEN 3
                    WHEN Nombre = 'IMC'     AND Direccion = 'MENOR' THEN 4
                    WHEN Nombre = 'Brazo'   AND Direccion = 'MAYOR' THEN 5
                    WHEN Nombre = 'Brazo'   AND Direccion = 'MENOR' THEN 6
                    WHEN Nombre = 'Cintura' AND Direccion = 'MAYOR' THEN 7
                    WHEN Nombre = 'Cintura' AND Direccion = 'MENOR' THEN 8
                    WHEN Nombre = 'Pecho'   AND Direccion = 'MAYOR' THEN 9
                    WHEN Nombre = 'Pecho'   AND Direccion = 'MENOR' THEN 10
                    WHEN Nombre = 'Pierna'  AND Direccion = 'MAYOR' THEN 11
                    WHEN Nombre = 'Pierna'  AND Direccion = 'MENOR' THEN 12
                    ELSE Orden
                END;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove the inserted Peso — Disminución if it matches the exact description we added
            migrationBuilder.Sql(@"DELETE FROM GoalTypes WHERE Nombre = 'Peso' AND Direccion = 'MENOR' AND Descripcion = 'Reducir el peso corporal.';");

            // Drop the Orden column
            migrationBuilder.DropColumn(
                name: "Orden",
                table: "GoalTypes");
        }
    }
}
