using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWeightHeightToProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Estatura",
                table: "profiles",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Peso",
                table: "profiles",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Estatura",
                table: "profiles");

            migrationBuilder.DropColumn(
                name: "Peso",
                table: "profiles");
        }
    }
}
