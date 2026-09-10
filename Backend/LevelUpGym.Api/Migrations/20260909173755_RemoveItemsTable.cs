using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveItemsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_membresias_items_IdItem",
                table: "membresias");

            migrationBuilder.DropTable(
                name: "items");

            migrationBuilder.DropIndex(
                name: "IX_membresias_IdItem",
                table: "membresias");

            migrationBuilder.DropColumn(
                name: "IdItem",
                table: "membresias");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "IdItem",
                table: "membresias",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "items",
                columns: table => new
                {
                    IdItem = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Tipo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_items", x => x.IdItem);
                });

            migrationBuilder.CreateIndex(
                name: "IX_membresias_IdItem",
                table: "membresias",
                column: "IdItem",
                unique: true,
                filter: "[IdItem] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_membresias_items_IdItem",
                table: "membresias",
                column: "IdItem",
                principalTable: "items",
                principalColumn: "IdItem");
        }
    }
}
