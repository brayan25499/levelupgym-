using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixProgressReportsForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProgressReports_clientes_ClientIdCliente",
                table: "ProgressReports");

            migrationBuilder.DropIndex(
                name: "IX_ProgressReports_ClientIdCliente",
                table: "ProgressReports");

            migrationBuilder.DropColumn(
                name: "ClientIdCliente",
                table: "ProgressReports");

            migrationBuilder.AlterColumn<string>(
                name: "Imc",
                table: "ProgressReports",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(3)",
                oldMaxLength: 3,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Altura",
                table: "ProgressReports",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(4)",
                oldMaxLength: 4,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProgressReports_IdCliente",
                table: "ProgressReports",
                column: "IdCliente");

            migrationBuilder.AddForeignKey(
                name: "FK_ProgressReports_clientes_IdCliente",
                table: "ProgressReports",
                column: "IdCliente",
                principalTable: "clientes",
                principalColumn: "IdCliente",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProgressReports_clientes_IdCliente",
                table: "ProgressReports");

            migrationBuilder.DropIndex(
                name: "IX_ProgressReports_IdCliente",
                table: "ProgressReports");

            migrationBuilder.AlterColumn<string>(
                name: "Imc",
                table: "ProgressReports",
                type: "nvarchar(3)",
                maxLength: 3,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Altura",
                table: "ProgressReports",
                type: "nvarchar(4)",
                maxLength: 4,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClientIdCliente",
                table: "ProgressReports",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_ProgressReports_ClientIdCliente",
                table: "ProgressReports",
                column: "ClientIdCliente");

            migrationBuilder.AddForeignKey(
                name: "FK_ProgressReports_clientes_ClientIdCliente",
                table: "ProgressReports",
                column: "ClientIdCliente",
                principalTable: "clientes",
                principalColumn: "IdCliente",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
