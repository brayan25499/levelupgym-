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
public class CartController : ControllerBase
{
    private readonly LevelUpDbContext _context;

    public CartController(LevelUpDbContext context)
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
    public async Task<ActionResult<Cart>> GetCart()
    {
        var clientId = await GetClientId();
        if (clientId == 0) return BadRequest("Client not found.");

        var cart = await _context.Carts
            .Include(c => c.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(c => c.IdCliente == clientId);

        if (cart == null)
        {
            cart = new Cart { IdCliente = clientId, CreatedAt = DateTime.UtcNow };
            _context.Carts.Add(cart);
            await _context.SaveChangesAsync();
        }

        return cart;
    }

    [HttpPost("items")]
    public async Task<IActionResult> AddToCart([FromBody] CartItemRequest request)
    {
        var clientId = await GetClientId();
        var cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.IdCliente == clientId);
        
        if (cart == null)
        {
            cart = new Cart { IdCliente = clientId, CreatedAt = DateTime.UtcNow };
            _context.Carts.Add(cart);
            await _context.SaveChangesAsync();
        }

        var existingItem = cart.Items.FirstOrDefault(i => i.IdProducto == request.IdProducto);
        if (existingItem != null)
        {
            existingItem.Cantidad += request.Cantidad;
        }
        else
        {
            _context.CartItems.Add(new CartItem
            {
                IdCarrito = cart.IdCarrito,
                IdProducto = request.IdProducto,
                Cantidad = request.Cantidad,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateQuantity(int id, [FromBody] int cantidad)
    {
        var item = await _context.CartItems.FindAsync(id);
        if (item == null) return NotFound();

        item.Cantidad = cantidad;
        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("items/{id}")]
    public async Task<IActionResult> RemoveFromCart(int id)
    {
        var item = await _context.CartItems.FindAsync(id);
        if (item == null) return NotFound();

        _context.CartItems.Remove(item);
        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("clear")]
    public async Task<IActionResult> ClearCart()
    {
        var clientId = await GetClientId();
        var cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.IdCliente == clientId);
        if (cart != null)
        {
            _context.CartItems.RemoveRange(cart.Items);
            await _context.SaveChangesAsync();
        }
        return Ok();
    }
}

public class CartItemRequest
{
    public int IdProducto { get; set; }
    public int Cantidad { get; set; }
}
