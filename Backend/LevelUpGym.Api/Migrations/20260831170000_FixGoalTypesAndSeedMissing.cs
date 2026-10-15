using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixGoalTypesAndSeedMissing : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Drop the old unique index on Nombre (only one direction allowed previously)
            migrationBuilder.DropIndex(
                name: "IX_GoalTypes_Nombre",
                table: "GoalTypes");

            // 2. Insert missing GoalTypes (Aumento / Disminución) if they do not already exist.
            // Nota: Utilizamos IF NOT EXISTS para evitar violaciones de restricción.
            // Peso - Aumento
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM GoalTypes WHERE Nombre = 'Peso' AND Direccion = 'MAYOR')
                BEGIN
                    INSERT INTO GoalTypes (Nombre, Descripcion, Unidad, TipoDato, Direccion, Activo, CreatedAt)
                    VALUES ('Peso', 'Aumentar el peso corporal.', 'kg', 'DECIMAL', 'MAYOR', 1, GETUTCDATE());
                END
            ");

            // IMC - Aumento
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM GoalTypes WHERE Nombre = 'IMC' AND Direccion = 'MAYOR')
                BEGIN
                    INSERT INTO GoalTypes (Nombre, Descripcion, Unidad, TipoDato, Direccion, Activo, CreatedAt)
                    VALUES ('IMC', 'Aumentar el índice de masa corporal.', '-', 'DECIMAL', 'MAYOR', 1, GETUTCDATE());
                END
            ");

            // Cintura - Aumento
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM GoalTypes WHERE Nombre = 'Cintura' AND Direccion = 'MAYOR')
                BEGIN
                    INSERT INTO GoalTypes (Nombre, Descripcion, Unidad, TipoDato, Direccion, Activo, CreatedAt)
                    VALUES ('Cintura', 'Aumentar la medida de cintura.', 'cm', 'DECIMAL', 'MAYOR', 1, GETUTCDATE());
                END
            ");

            // Pecho - Disminución
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM GoalTypes WHERE Nombre = 'Pecho' AND Direccion = 'MENOR')
                BEGIN
                    INSERT INTO GoalTypes (Nombre, Descripcion, Unidad, TipoDato, Direccion, Activo, CreatedAt)
                    VALUES ('Pecho', 'Reducir la medida de pecho.', 'cm', 'DECIMAL', 'MENOR', 1, GETUTCDATE());
                END
            ");

            // Brazo - Disminución
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM GoalTypes WHERE Nombre = 'Brazo' AND Direccion = 'MENOR')
                BEGIN
                    INSERT INTO GoalTypes (Nombre, Descripcion, Unidad, TipoDato, Direccion, Activo, CreatedAt)
                    VALUES ('Brazo', 'Reducir la medida de brazo.', 'cm', 'DECIMAL', 'MENOR', 1, GETUTCDATE());
                END
            ");

            // Pierna - Disminución
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM GoalTypes WHERE Nombre = 'Pierna' AND Direccion = 'MENOR')
                BEGIN
                    INSERT INTO GoalTypes (Nombre, Descripcion, Unidad, TipoDato, Direccion, Activo, CreatedAt)
                    VALUES ('Pierna', 'Reducir la medida de pierna.', 'cm', 'DECIMAL', 'MENOR', 1, GETUTCDATE());
                END
            ");

            // 3. Create a new filtered unique index on (Nombre, Direccion) for active records.
            migrationBuilder.CreateIndex(
                name: "IX_GoalTypes_Nombre_Direccion_Unique",
                table: "GoalTypes",
                columns: new[] { "Nombre", "Direccion" },
                unique: true,
                filter: "[DeletedAt] IS NULL");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // 1. Remove the composite unique index.
            migrationBuilder.DropIndex(
                name: "IX_GoalTypes_Nombre_Direccion_Unique",
                table: "GoalTypes");

            // 2. Delete the rows that were inserted by this migration (only those with Direccion = 'MAYOR' for Peso, IMC, Cintura and Direccion = 'MENOR' for Pecho, Brazo, Pierna).
            migrationBuilder.Sql(@"DELETE FROM GoalTypes WHERE (Nombre = 'Peso' AND Direccion = 'MAYOR') OR (Nombre = 'IMC' AND Direccion = 'MAYOR') OR (Nombre = 'Cintura' AND Direccion = 'MAYOR') OR (Nombre = 'Pecho' AND Direccion = 'MENOR') OR (Nombre = 'Brazo' AND Direccion = 'MENOR') OR (Nombre = 'Pierna' AND Direccion = 'MENOR');");

            // 3. Re‑create the old unique index on Nombre only (as it existed originally).
            migrationBuilder.CreateIndex(
                name: "IX_GoalTypes_Nombre",
                table: "GoalTypes",
                column: "Nombre",
                unique: true);
        }
    }
}
