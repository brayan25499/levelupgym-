using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LevelUpGym.Api.Data;
using LevelUpGym.Api.Models;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace LevelUpGym.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly LevelUpDbContext _context;

    public SalesController(LevelUpDbContext context)
    {
        _context = context;
    }

    private async Task<int> GetClientId()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var auth = await _context.Auths.Include(a => a.Profile).ThenInclude(p => p.Client)
            .FirstOrDefaultAsync(a => a.Email == email);
        return auth?.Profile?.Client?.IdCliente ?? 0;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Sale>>> GetSales()
    {
        var clientId = await GetClientId();
        return await _context.Sales
            .Where(s => s.IdCliente == clientId)
            .Include(s => s.Details)
                .ThenInclude(d => d.Item)
            .ToListAsync();
    }

    [HttpGet("all")]
    public async Task<ActionResult<IEnumerable<object>>> GetAllSales()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (email != "admin@levelup.com") return Unauthorized("Acceso no autorizado.");

        return await _context.Sales
            .Include(s => s.Client)
                .ThenInclude(c => c.Profile)
            .Select(s => new {
                idVenta = s.IdVenta,
                clienteNombre = (s.Client != null && s.Client.Profile != null) ? s.Client.Profile.Nombre + " " + s.Client.Profile.Apellidos : "Cliente Eliminado",
                fecha = s.Fecha,
                total = s.Total,
                metodoPago = "Tarjeta de Crédito"
            })
            .OrderByDescending(s => s.fecha)
            .ToListAsync();
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout()
    {
        var clientId = await GetClientId();
        if (clientId == 0) return BadRequest("Client not found.");

        var cart = await _context.Carts
            .Include(c => c.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(c => c.IdCliente == clientId);

        if (cart == null || !cart.Items.Any())
            return BadRequest("Cart is empty.");

        // Get or Create a default payment method (e.g., "EFECTIVO" or "TARJETA")
        var paymentMethod = await _context.PaymentMethods.FirstOrDefaultAsync() 
            ?? new PaymentMethod { Nombre = "TARJETA" };
        
        if (paymentMethod.IdPago == 0)
        {
            _context.PaymentMethods.Add(paymentMethod);
            await _context.SaveChangesAsync();
        }

        var sale = new Sale
        {
            IdCliente = clientId,
            MetodoPago = paymentMethod.IdPago,
            Fecha = DateTime.UtcNow,
            Total = cart.Items.Sum(i => i.Product.PrecioVenta * i.Cantidad),
            CreatedAt = DateTime.UtcNow
        };

        _context.Sales.Add(sale);
        await _context.SaveChangesAsync();

        foreach (var item in cart.Items)
        {
            _context.SaleDetails.Add(new SaleDetail
            {
                IdVenta = sale.IdVenta,
                IdItem = item.Product.IdItem,
                Cantidad = item.Cantidad,
                PrecioUnitario = item.Product.PrecioVenta,
                SubTotal = item.Product.PrecioVenta * item.Cantidad,
                CreatedAt = DateTime.UtcNow
            });
        }

        _context.CartItems.RemoveRange(cart.Items);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Compra realizada con éxito", saleId = sale.IdVenta });
    }
}
