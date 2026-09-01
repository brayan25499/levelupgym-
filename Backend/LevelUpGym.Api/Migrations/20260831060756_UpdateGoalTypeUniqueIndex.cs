using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateGoalTypeUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GoalTypes_Nombre' AND object_id = OBJECT_ID('GoalTypes'))
    DROP INDEX [IX_GoalTypes_Nombre] ON [GoalTypes];
");

            // Add Orden column if it does not exist
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'Orden' AND Object_ID = OBJECT_ID(N'GoalTypes'))
BEGIN
    ALTER TABLE [GoalTypes] ADD [Orden] int NOT NULL CONSTRAINT DF_GoalTypes_Orden DEFAULT 0;
END
");

            migrationBuilder.CreateIndex(
                name: "IX_GoalTypes_Nombre_Direccion",
                table: "GoalTypes",
                columns: new[] { "Nombre", "Direccion" },
                unique: true,
                filter: "[DeletedAt] IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GoalTypes_Nombre_Direccion",
                table: "GoalTypes");

            migrationBuilder.DropColumn(
                name: "Orden",
                table: "GoalTypes");

            migrationBuilder.CreateIndex(
                name: "IX_GoalTypes_Nombre",
                table: "GoalTypes",
                column: "Nombre",
                unique: true);
        }
    }
}
