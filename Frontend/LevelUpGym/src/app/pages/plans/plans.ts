import { Component, OnInit, inject, signal } from '@angular/core';
import { MembershipService, Membership } from '../../services/membership';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-plans',
  imports: [CommonModule],
  templateUrl: './plans.html',
  styleUrl: './plans.css',
})
export class PlansComponent implements OnInit {
  private membershipService = inject(MembershipService);
  private authService = inject(AuthService);
  private router = inject(Router);

  plans = signal<Membership[]>([]);

  ngOnInit() {
    this.membershipService.getMemberships().subscribe({
      next: (data) => {
        console.log('Plans from API:', data);
        this.plans.set(data);
      },
      error: (err) => {
        console.error('API Error fetching plans:', err);
        // Mock data if backend fails
        this.plans.set([
          { idMembresia: 1, nombre: 'Bronce', precio: 89900, descripcion: 'Acceso básico a sala de pesas', estado: 'ACTIVO' },
          { idMembresia: 2, nombre: 'Plata', precio: 159900, descripcion: 'Acceso total + Clases grupales', estado: 'ACTIVO' },
          { idMembresia: 3, nombre: 'Oro', precio: 279900, descripcion: 'VIP: Todo incluido + Nutricionista', estado: 'ACTIVO' }
        ]);
      }
    });
  }

  buyPlan(id: number) {
    if (!this.authService.currentUser()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/plans' } });
      return;
    }

    this.membershipService.buyMembership(id).subscribe({
      next: (res) => {
        alert(res.message);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => alert('Error al procesar compra: ' + (err.error?.message || err.message))
    });
  }
}
