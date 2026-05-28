import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth';

export interface CartItem {
  idCartItem: number;
  idProducto: number;
  cantidad: number;
  product: any;
}

export interface Cart {
  idCarrito: number;
  idCliente: number;
  items: CartItem[];
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = 'http://localhost:5143/api/cart';
  
  cart = signal<Cart | null>(null);

  constructor() {
    // Initial load if logged in
    if (this.authService.currentUser()) {
      this.loadCart().subscribe();
    }
  }

  loadCart(): Observable<Cart> {
    return this.http.get<Cart>(this.apiUrl).pipe(
      tap(cart => this.cart.set(cart))
    );
  }

  addToCart(idProducto: number, cantidad: number = 1): Observable<any> {
    return this.http.post(`${this.apiUrl}/items`, { idProducto, cantidad }).pipe(
      tap(() => this.loadCart().subscribe())
    );
  }

  updateQuantity(idCartItem: number, cantidad: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/items/${idCartItem}`, cantidad).pipe(
      tap(() => this.loadCart().subscribe())
    );
  }

  removeFromCart(idCartItem: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/items/${idCartItem}`).pipe(
      tap(() => this.loadCart().subscribe())
    );
  }

  clearCart(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/clear`).pipe(
      tap(() => this.cart.set(null))
    );
  }

  checkout(): Observable<any> {
    return this.http.post(`http://localhost:5143/api/sales/checkout`, {}).pipe(
      tap(() => this.cart.set(null))
    );
  }

  getTotalItems(): number {
    return this.cart()?.items.reduce((acc, item) => acc + item.cantidad, 0) || 0;
  }

  getTotalPrice(): number {
    return this.cart()?.items.reduce((acc, item) => acc + (item.product?.precioVenta * item.cantidad), 0) || 0;
  }
}
