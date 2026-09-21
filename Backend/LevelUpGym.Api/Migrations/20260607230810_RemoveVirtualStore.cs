using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveVirtualStore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "carrito_items");

            migrationBuilder.DropTable(
                name: "PurchaseDetails");

            migrationBuilder.DropTable(
                name: "SaleDetails");

            migrationBuilder.DropTable(
                name: "carritos");

            migrationBuilder.DropTable(
                name: "compras");

            migrationBuilder.DropTable(
                name: "productos");

            migrationBuilder.DropTable(
                name: "ventas");

            migrationBuilder.DropTable(
                name: "Providers");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "PaymentMethods");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "carritos",
                columns: table => new
                {
                    IdCarrito = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdCliente = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_carritos", x => x.IdCarrito);
                    table.ForeignKey(
                        name: "FK_carritos_clientes_IdCliente",
                        column: x => x.IdCliente,
                        principalTable: "clientes",
                        principalColumn: "IdCliente",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    IdCategoria = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Descripcion = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Nombre = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.IdCategoria);
                });

            migrationBuilder.CreateTable(
                name: "PaymentMethods",
                columns: table => new
                {
                    IdPago = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Nombre = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentMethods", x => x.IdPago);
                });

            migrationBuilder.CreateTable(
                name: "Providers",
                columns: table => new
                {
                    IdProveedor = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Direccion = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Nombre = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Telefono = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Providers", x => x.IdProveedor);
                });

            migrationBuilder.CreateTable(
                name: "productos",
                columns: table => new
                {
                    IdProducto = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdCategoria = table.Column<int>(type: "int", nullable: true),
                    IdItem = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Descripcion = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Nombre = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    PrecioVenta = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_productos", x => x.IdProducto);
                    table.ForeignKey(
                        name: "FK_productos_Categories_IdCategoria",
                        column: x => x.IdCategoria,
                        principalTable: "Categories",
                        principalColumn: "IdCategoria");
                    table.ForeignKey(
                        name: "FK_productos_items_IdItem",
                        column: x => x.IdItem,
                        principalTable: "items",
                        principalColumn: "IdItem");
                });

            migrationBuilder.CreateTable(
                name: "ventas",
                columns: table => new
                {
                    IdVenta = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdCliente = table.Column<int>(type: "int", nullable: true),
                    MetodoPago = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Fecha = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Total = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ventas", x => x.IdVenta);
                    table.ForeignKey(
                        name: "FK_ventas_PaymentMethods_MetodoPago",
                        column: x => x.MetodoPago,
                        principalTable: "PaymentMethods",
                        principalColumn: "IdPago");
                    table.ForeignKey(
                        name: "FK_ventas_clientes_IdCliente",
                        column: x => x.IdCliente,
                        principalTable: "clientes",
                        principalColumn: "IdCliente");
                });

            migrationBuilder.CreateTable(
                name: "compras",
                columns: table => new
                {
                    IdCompra = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdProveedor = table.Column<int>(type: "int", nullable: true),
                    MetodoPago = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Fecha = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Total = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_compras", x => x.IdCompra);
                    table.ForeignKey(
                        name: "FK_compras_PaymentMethods_MetodoPago",
                        column: x => x.MetodoPago,
                        principalTable: "PaymentMethods",
                        principalColumn: "IdPago");
                    table.ForeignKey(
                        name: "FK_compras_Providers_IdProveedor",
                        column: x => x.IdProveedor,
                        principalTable: "Providers",
                        principalColumn: "IdProveedor");
                });

            migrationBuilder.CreateTable(
                name: "carrito_items",
                columns: table => new
                {
                    IdCartItem = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdCarrito = table.Column<int>(type: "int", nullable: false),
                    IdProducto = table.Column<int>(type: "int", nullable: false),
                    Cantidad = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_carrito_items", x => x.IdCartItem);
                    table.ForeignKey(
                        name: "FK_carrito_items_carritos_IdCarrito",
                        column: x => x.IdCarrito,
                        principalTable: "carritos",
                        principalColumn: "IdCarrito",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_carrito_items_productos_IdProducto",
                        column: x => x.IdProducto,
                        principalTable: "productos",
                        principalColumn: "IdProducto",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SaleDetails",
                columns: table => new
                {
                    IdDetalle = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ItemIdItem = table.Column<int>(type: "int", nullable: true),
                    SaleIdVenta = table.Column<int>(type: "int", nullable: true),
                    Cantidad = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IdItem = table.Column<int>(type: "int", nullable: true),
                    IdVenta = table.Column<int>(type: "int", nullable: true),
                    PrecioUnitario = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    SubTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SaleDetails", x => x.IdDetalle);
                    table.ForeignKey(
                        name: "FK_SaleDetails_items_ItemIdItem",
                        column: x => x.ItemIdItem,
                        principalTable: "items",
                        principalColumn: "IdItem");
                    table.ForeignKey(
                        name: "FK_SaleDetails_ventas_SaleIdVenta",
                        column: x => x.SaleIdVenta,
                        principalTable: "ventas",
                        principalColumn: "IdVenta");
                });

            migrationBuilder.CreateTable(
                name: "PurchaseDetails",
                columns: table => new
                {
                    IdDetalle = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductIdProducto = table.Column<int>(type: "int", nullable: true),
                    PurchaseIdCompra = table.Column<int>(type: "int", nullable: true),
                    Cantidad = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IdCompra = table.Column<int>(type: "int", nullable: true),
                    IdProducto = table.Column<int>(type: "int", nullable: true),
                    PrecioUnitario = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    Subtotal = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseDetails", x => x.IdDetalle);
                    table.ForeignKey(
                        name: "FK_PurchaseDetails_compras_PurchaseIdCompra",
                        column: x => x.PurchaseIdCompra,
                        principalTable: "compras",
                        principalColumn: "IdCompra");
                    table.ForeignKey(
                        name: "FK_PurchaseDetails_productos_ProductIdProducto",
                        column: x => x.ProductIdProducto,
                        principalTable: "productos",
                        principalColumn: "IdProducto");
                });

            migrationBuilder.CreateIndex(
                name: "IX_carrito_items_IdCarrito",
                table: "carrito_items",
                column: "IdCarrito");

            migrationBuilder.CreateIndex(
                name: "IX_carrito_items_IdProducto",
                table: "carrito_items",
                column: "IdProducto");

            migrationBuilder.CreateIndex(
                name: "IX_carritos_IdCliente",
                table: "carritos",
                column: "IdCliente");

            migrationBuilder.CreateIndex(
                name: "IX_compras_IdProveedor",
                table: "compras",
                column: "IdProveedor");

            migrationBuilder.CreateIndex(
                name: "IX_compras_MetodoPago",
                table: "compras",
                column: "MetodoPago");

            migrationBuilder.CreateIndex(
                name: "IX_productos_IdCategoria",
                table: "productos",
                column: "IdCategoria");

            migrationBuilder.CreateIndex(
                name: "IX_productos_IdItem",
                table: "productos",
                column: "IdItem",
                unique: true,
                filter: "[IdItem] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_productos_Nombre",
                table: "productos",
                column: "Nombre",
                unique: true,
                filter: "[Nombre] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseDetails_ProductIdProducto",
                table: "PurchaseDetails",
                column: "ProductIdProducto");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseDetails_PurchaseIdCompra",
                table: "PurchaseDetails",
                column: "PurchaseIdCompra");

            migrationBuilder.CreateIndex(
                name: "IX_SaleDetails_ItemIdItem",
                table: "SaleDetails",
                column: "ItemIdItem");

            migrationBuilder.CreateIndex(
                name: "IX_SaleDetails_SaleIdVenta",
                table: "SaleDetails",
                column: "SaleIdVenta");

            migrationBuilder.CreateIndex(
                name: "IX_ventas_IdCliente",
                table: "ventas",
                column: "IdCliente");

            migrationBuilder.CreateIndex(
                name: "IX_ventas_MetodoPago",
                table: "ventas",
                column: "MetodoPago");
        }
    }
}
