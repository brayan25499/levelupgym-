import { Component, OnInit, inject, signal } from '@angular/core';
import { ProductService, Product } from '../../services/product';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-store',
  imports: [CommonModule],
  templateUrl: './store.html',
  styleUrl: './store.css',
})
export class StoreComponent implements OnInit {
  private productService = inject(ProductService);
  public cartService = inject(CartService);
  public authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  products = signal<Product[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: () => {
        // Mock data
        this.products.set([
          { idProducto: 1, nombre: 'Whey Gold Standard 2lb', precioVenta: 189900, descripcion: 'Proteína de suero de leche de alta calidad para la recuperación muscular.', estado: 'ACTIVO' },
          { idProducto: 2, nombre: 'Creatina Monohidrato 500g', precioVenta: 89900, descripcion: 'Aumenta tu fuerza, potencia e hidratación muscular.', estado: 'ACTIVO' },
          { idProducto: 3, nombre: 'Pre-Entreno Psicótico 300g', precioVenta: 125000, descripcion: 'Energía explosiva y enfoque extremo para tus entrenamientos.', estado: 'ACTIVO' },
          { idProducto: 4, nombre: 'Shaker Mezclador Pro 700ml', precioVenta: 35000, descripcion: 'Mezclador hermético con rejilla para batidos sin grumos.', estado: 'ACTIVO' },
          { idProducto: 5, nombre: 'Cinturón Gym de Cuero', precioVenta: 95000, descripcion: 'Soporte lumbar premium para levantamientos pesados.', estado: 'ACTIVO' },
          { idProducto: 6, nombre: 'Straps de Agarre Pro', precioVenta: 29900, descripcion: 'Correas de algodón reforzado para mejorar tu agarre.', estado: 'ACTIVO' },
          { idProducto: 7, nombre: 'Aminoácidos BCAA 300g', precioVenta: 79900, descripcion: 'Previene el catabolismo y mejora la síntesis proteica.', estado: 'ACTIVO' },
          { idProducto: 8, nombre: 'Multivitamínico Sports 90 caps', precioVenta: 49900, descripcion: 'Vitaminas y minerales esenciales para deportistas.', estado: 'ACTIVO' }
        ]);
        this.loading.set(false);
      }
    });
  }

  getProductImage(nombre: string): string {
    const images: { [key: string]: string } = {
      'Whey Gold Standard 2lb': 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=600&auto=format&fit=crop',
      'Creatina Monohidrato 500g': 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=600&auto=format&fit=crop',
      'Pre-Entreno Psicótico 300g': 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?q=80&w=600&auto=format&fit=crop',
      'Shaker Mezclador Pro 700ml': 'https://images.unsplash.com/photo-1593095947575-b66e3cf0c115?q=80&w=600&auto=format&fit=crop',
      'Cinturón Gym de Cuero': 'https://images.unsplash.com/photo-1620188467120-5042ed1eb5da?q=80&w=600&auto=format&fit=crop',
      'Straps de Agarre Pro': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop',
      'Aminoácidos BCAA 300g': 'https://images.unsplash.com/photo-1546412414-8035e1776c9a?q=80&w=600&auto=format&fit=crop',
      'Multivitamínico Sports 90 caps': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=600&auto=format&fit=crop'
    };
    return images[nombre] || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop';
  }

  addToCart(product: Product) {
    if (!this.authService.currentUser()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/store' } });
      return;
    }

    this.cartService.addToCart(product.idProducto).subscribe({
      next: () => this.alertService.success(`${product.nombre} agregado al carrito.`),
      error: (err) => {
        console.error('Cart Error:', err);
        this.alertService.error('Error al agregar al carrito. Asegúrate de tener una sesión activa.');
      }
    });
  }

  goToCart() {
    this.router.navigate(['/dashboard'], { queryParams: { section: 'carrito' } });
  }
}

