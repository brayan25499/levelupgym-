using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    public partial class AddOrdenColumnAndSetOrder : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add Orden column (nullable to support existing rows)
            migrationBuilder.AddColumn<int>(
                name: "Orden",
                table: "GoalTypes",
                type: "int",
                nullable: true);

            // Set ordering for each measurement (both directions)
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
                END;");

            // Ensure Peso — Disminución description is correct (in case it existed already)
            migrationBuilder.Sql(@"UPDATE GoalTypes SET Descripcion = 'Reducir el peso corporal.' WHERE Nombre = 'Peso' AND Direccion = 'MENOR';");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Orden",
                table: "GoalTypes");
        }
    }
}
