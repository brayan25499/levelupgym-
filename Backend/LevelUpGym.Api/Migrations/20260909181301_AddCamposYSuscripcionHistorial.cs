using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LevelUpGym.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCamposYSuscripcionHistorial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_suscripciones_SubscriptionStatuses_IdEstado",
                table: "suscripciones");

            migrationBuilder.DropForeignKey(
                name: "FK_suscripciones_clientes_IdCliente",
                table: "suscripciones");

            migrationBuilder.DropForeignKey(
                name: "FK_suscripciones_membresias_IdMembresia",
                table: "suscripciones");

            migrationBuilder.DropIndex(
                name: "IX_suscripciones_IdCliente",
                table: "suscripciones");

            migrationBuilder.AddColumn<int>(
                name: "IdSuscripcionAnterior",
                table: "suscripciones",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdVenta",
                table: "suscripciones",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Precio",
                table: "suscripciones",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            // Data Patch: Seed missing SubscriptionStatuses
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM SubscriptionStatuses WHERE Concepto = 'PENDIENTE')
                    INSERT INTO SubscriptionStatuses (Concepto, CreatedAt) VALUES ('PENDIENTE', GETUTCDATE());
                IF NOT EXISTS (SELECT 1 FROM SubscriptionStatuses WHERE Concepto = 'VENCIDA')
                    INSERT INTO SubscriptionStatuses (Concepto, CreatedAt) VALUES ('VENCIDA', GETUTCDATE());
                IF NOT EXISTS (SELECT 1 FROM SubscriptionStatuses WHERE Concepto = 'CANCELADA')
                    INSERT INTO SubscriptionStatuses (Concepto, CreatedAt) VALUES ('CANCELADA', GETUTCDATE());
                IF NOT EXISTS (SELECT 1 FROM SubscriptionStatuses WHERE Concepto = 'REEMPLAZADA')
                    INSERT INTO SubscriptionStatuses (Concepto, CreatedAt) VALUES ('REEMPLAZADA', GETUTCDATE());

                -- Update existing subscriptions price from memberships catalog
                UPDATE s
                SET s.Precio = ISNULL(m.Precio, 0)
                FROM suscripciones s
                INNER JOIN membresias m ON s.IdMembresia = m.IdMembresia
                WHERE s.Precio = 0;

                -- Cleanup duplicate active subscriptions: keep only latest per client, set older to REEMPLAZADA (IdEstado = 5)
                WITH CTE AS (
                    SELECT IdSuscripcion, IdCliente, IdEstado,
                           ROW_NUMBER() OVER (PARTITION BY IdCliente ORDER BY IdSuscripcion DESC) AS RowNum
                    FROM suscripciones
                    WHERE IdEstado = 1 AND DeletedAt IS NULL
                )
                UPDATE suscripciones
                SET IdEstado = (SELECT TOP 1 IdEstado FROM SubscriptionStatuses WHERE Concepto = 'REEMPLAZADA'), UpdatedAt = GETUTCDATE()
                WHERE IdSuscripcion IN (SELECT IdSuscripcion FROM CTE WHERE RowNum > 1);

                -- Add Check constraints
                IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_ventas_Total')
                    ALTER TABLE ventas ADD CONSTRAINT CK_ventas_Total CHECK (Total >= 0);
                IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_ventas_Subtotal')
                    ALTER TABLE ventas ADD CONSTRAINT CK_ventas_Subtotal CHECK (Subtotal >= 0);
                IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_ventas_Descuento')
                    ALTER TABLE ventas ADD CONSTRAINT CK_ventas_Descuento CHECK (Descuento >= 0);

                IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_venta_detalles_Cantidad')
                    ALTER TABLE venta_detalles ADD CONSTRAINT CK_venta_detalles_Cantidad CHECK (Cantidad > 0);
                IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_venta_detalles_PrecioUnitario')
                    ALTER TABLE venta_detalles ADD CONSTRAINT CK_venta_detalles_PrecioUnitario CHECK (PrecioUnitario >= 0);

                IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_pagos_Monto')
                    ALTER TABLE pagos ADD CONSTRAINT CK_pagos_Monto CHECK (Monto >= 0);

                IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_suscripciones_Precio')
                    ALTER TABLE suscripciones ADD CONSTRAINT CK_suscripciones_Precio CHECK (Precio >= 0);
                IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_suscripciones_Fechas')
                    ALTER TABLE suscripciones ADD CONSTRAINT CK_suscripciones_Fechas CHECK (FechaFin >= FechaInicio);
            ");

            migrationBuilder.CreateIndex(
                name: "IX_suscripciones_ClienteActiva",
                table: "suscripciones",
                column: "IdCliente",
                unique: true,
                filter: "[IdEstado] = 1 AND [DeletedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_suscripciones_IdSuscripcionAnterior",
                table: "suscripciones",
                column: "IdSuscripcionAnterior");

            migrationBuilder.CreateIndex(
                name: "IX_suscripciones_IdVenta",
                table: "suscripciones",
                column: "IdVenta");

            migrationBuilder.AddForeignKey(
                name: "FK_suscripciones_SubscriptionStatuses_IdEstado",
                table: "suscripciones",
                column: "IdEstado",
                principalTable: "SubscriptionStatuses",
                principalColumn: "IdEstado",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_suscripciones_clientes_IdCliente",
                table: "suscripciones",
                column: "IdCliente",
                principalTable: "clientes",
                principalColumn: "IdCliente",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_suscripciones_membresias_IdMembresia",
                table: "suscripciones",
                column: "IdMembresia",
                principalTable: "membresias",
                principalColumn: "IdMembresia",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_suscripciones_suscripciones_IdSuscripcionAnterior",
                table: "suscripciones",
                column: "IdSuscripcionAnterior",
                principalTable: "suscripciones",
                principalColumn: "IdSuscripcion",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_suscripciones_ventas_IdVenta",
                table: "suscripciones",
                column: "IdVenta",
                principalTable: "ventas",
                principalColumn: "IdVenta",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_suscripciones_SubscriptionStatuses_IdEstado",
                table: "suscripciones");

            migrationBuilder.DropForeignKey(
                name: "FK_suscripciones_clientes_IdCliente",
                table: "suscripciones");

            migrationBuilder.DropForeignKey(
                name: "FK_suscripciones_membresias_IdMembresia",
                table: "suscripciones");

            migrationBuilder.DropForeignKey(
                name: "FK_suscripciones_suscripciones_IdSuscripcionAnterior",
                table: "suscripciones");

            migrationBuilder.DropForeignKey(
                name: "FK_suscripciones_ventas_IdVenta",
                table: "suscripciones");

            migrationBuilder.DropIndex(
                name: "IX_suscripciones_ClienteActiva",
                table: "suscripciones");

            migrationBuilder.DropIndex(
                name: "IX_suscripciones_IdSuscripcionAnterior",
                table: "suscripciones");

            migrationBuilder.DropIndex(
                name: "IX_suscripciones_IdVenta",
                table: "suscripciones");

            migrationBuilder.DropColumn(
                name: "IdSuscripcionAnterior",
                table: "suscripciones");

            migrationBuilder.DropColumn(
                name: "IdVenta",
                table: "suscripciones");

            migrationBuilder.DropColumn(
                name: "Precio",
                table: "suscripciones");

            migrationBuilder.CreateIndex(
                name: "IX_suscripciones_IdCliente",
                table: "suscripciones",
                column: "IdCliente");

            migrationBuilder.AddForeignKey(
                name: "FK_suscripciones_SubscriptionStatuses_IdEstado",
                table: "suscripciones",
                column: "IdEstado",
                principalTable: "SubscriptionStatuses",
                principalColumn: "IdEstado",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_suscripciones_clientes_IdCliente",
                table: "suscripciones",
                column: "IdCliente",
                principalTable: "clientes",
                principalColumn: "IdCliente",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_suscripciones_membresias_IdMembresia",
                table: "suscripciones",
                column: "IdMembresia",
                principalTable: "membresias",
                principalColumn: "IdMembresia",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
