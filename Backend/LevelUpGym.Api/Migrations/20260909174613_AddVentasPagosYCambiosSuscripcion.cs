using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVentasPagosYCambiosSuscripcion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ventas",
                columns: table => new
                {
                    IdVenta = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdCliente = table.Column<int>(type: "int", nullable: false),
                    TipoVenta = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Subtotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Descuento = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Total = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ventas", x => x.IdVenta);
                    table.ForeignKey(
                        name: "FK_ventas_clientes_IdCliente",
                        column: x => x.IdCliente,
                        principalTable: "clientes",
                        principalColumn: "IdCliente",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cambios_suscripcion",
                columns: table => new
                {
                    IdCambioSuscripcion = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdCliente = table.Column<int>(type: "int", nullable: false),
                    IdSuscripcionAnterior = table.Column<int>(type: "int", nullable: false),
                    IdSuscripcionNueva = table.Column<int>(type: "int", nullable: false),
                    IdVenta = table.Column<int>(type: "int", nullable: true),
                    PrecioAnterior = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PrecioNuevo = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreditoAplicado = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ValorAdicional = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ValorDevuelto = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Motivo = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cambios_suscripcion", x => x.IdCambioSuscripcion);
                    table.ForeignKey(
                        name: "FK_cambios_suscripcion_clientes_IdCliente",
                        column: x => x.IdCliente,
                        principalTable: "clientes",
                        principalColumn: "IdCliente",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cambios_suscripcion_suscripciones_IdSuscripcionAnterior",
                        column: x => x.IdSuscripcionAnterior,
                        principalTable: "suscripciones",
                        principalColumn: "IdSuscripcion",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cambios_suscripcion_suscripciones_IdSuscripcionNueva",
                        column: x => x.IdSuscripcionNueva,
                        principalTable: "suscripciones",
                        principalColumn: "IdSuscripcion",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cambios_suscripcion_ventas_IdVenta",
                        column: x => x.IdVenta,
                        principalTable: "ventas",
                        principalColumn: "IdVenta",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "pagos",
                columns: table => new
                {
                    IdPago = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdVenta = table.Column<int>(type: "int", nullable: false),
                    MetodoPago = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Proveedor = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReferenciaExterna = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Monto = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FechaPago = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Metadata = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pagos", x => x.IdPago);
                    table.ForeignKey(
                        name: "FK_pagos_ventas_IdVenta",
                        column: x => x.IdVenta,
                        principalTable: "ventas",
                        principalColumn: "IdVenta",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "venta_detalles",
                columns: table => new
                {
                    IdVentaDetalle = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdVenta = table.Column<int>(type: "int", nullable: false),
                    IdMembresia = table.Column<int>(type: "int", nullable: false),
                    Descripcion = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Cantidad = table.Column<int>(type: "int", nullable: false),
                    PrecioUnitario = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Descuento = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Subtotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_venta_detalles", x => x.IdVentaDetalle);
                    table.ForeignKey(
                        name: "FK_venta_detalles_membresias_IdMembresia",
                        column: x => x.IdMembresia,
                        principalTable: "membresias",
                        principalColumn: "IdMembresia",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_venta_detalles_ventas_IdVenta",
                        column: x => x.IdVenta,
                        principalTable: "ventas",
                        principalColumn: "IdVenta",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cambios_suscripcion_IdCliente",
                table: "cambios_suscripcion",
                column: "IdCliente");

            migrationBuilder.CreateIndex(
                name: "IX_cambios_suscripcion_IdSuscripcionAnterior",
                table: "cambios_suscripcion",
                column: "IdSuscripcionAnterior");

            migrationBuilder.CreateIndex(
                name: "IX_cambios_suscripcion_IdSuscripcionNueva",
                table: "cambios_suscripcion",
                column: "IdSuscripcionNueva");

            migrationBuilder.CreateIndex(
                name: "IX_cambios_suscripcion_IdVenta",
                table: "cambios_suscripcion",
                column: "IdVenta");

            migrationBuilder.CreateIndex(
                name: "IX_pagos_IdVenta",
                table: "pagos",
                column: "IdVenta");

            migrationBuilder.CreateIndex(
                name: "IX_pagos_ReferenciaExterna",
                table: "pagos",
                column: "ReferenciaExterna",
                unique: true,
                filter: "[ReferenciaExterna] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_venta_detalles_IdMembresia",
                table: "venta_detalles",
                column: "IdMembresia");

            migrationBuilder.CreateIndex(
                name: "IX_venta_detalles_IdVenta",
                table: "venta_detalles",
                column: "IdVenta");

            migrationBuilder.CreateIndex(
                name: "IX_ventas_IdCliente",
                table: "ventas",
                column: "IdCliente");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cambios_suscripcion");

            migrationBuilder.DropTable(
                name: "pagos");

            migrationBuilder.DropTable(
                name: "venta_detalles");

            migrationBuilder.DropTable(
                name: "ventas");
        }
    }
}
