using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveEpsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_empleados_EpsList_IdEps",
                table: "empleados");

            migrationBuilder.DropTable(
                name: "EpsList");

            migrationBuilder.DropIndex(
                name: "IX_empleados_IdEps",
                table: "empleados");

            migrationBuilder.DropColumn(
                name: "IdEps",
                table: "empleados");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "IdEps",
                table: "empleados",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EpsList",
                columns: table => new
                {
                    IdEps = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Nombre = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EpsList", x => x.IdEps);
                });

            migrationBuilder.CreateIndex(
                name: "IX_empleados_IdEps",
                table: "empleados",
                column: "IdEps");

            migrationBuilder.AddForeignKey(
                name: "FK_empleados_EpsList_IdEps",
                table: "empleados",
                column: "IdEps",
                principalTable: "EpsList",
                principalColumn: "IdEps");
        }
    }
}
