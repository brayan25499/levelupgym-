import { Component, OnInit, inject, signal } from '@angular/core';
import { MembershipService, Membership } from '../../services/membership';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

export interface PlanDisplay {
  idMembresia: number;
  nombre: string;
  precio: number;
  descripcion: string;
  badge?: string;
  tier: 'bronce' | 'plata' | 'oro';
  icon: string;
  beneficios: string[];
}

const DEFAULT_PLANS_DATA: Record<string, Omit<PlanDisplay, 'idMembresia' | 'precio'>> = {
  bronce: {
    nombre: 'Bronce',
    descripcion: 'Ideal para comenzar',
    tier: 'bronce',
    icon: 'assets/img/bronze-crown.png',
    beneficios: [
      'Acceso a sala de pesas',
      'Vestidores y duchas',
      'App LevelUp básica',
      'Acceso en horario estándar'
    ]
  },
  plata: {
    nombre: 'Plata',
    descripcion: 'Más entrenamiento, más beneficios',
    badge: 'MÁS ELEGIDO',
    tier: 'plata',
    icon: 'assets/img/silver-crown.png',
    beneficios: [
      'Todo lo incluido en Bronce',
      'Clases grupales',
      'Acceso a zonas de entrenamiento funcional',
      'Rutina de entrenamiento personalizada',
      'Seguimiento básico de progreso',
      'App LevelUp completa'
    ]
  },
  oro: {
    nombre: 'Oro',
    descripcion: 'VIP — La experiencia completa',
    badge: 'VIP EXCLUSIVO',
    tier: 'oro',
    icon: 'assets/img/gold-crown.png',
    beneficios: [
      'Todo lo incluido en Plata',
      'Acceso prioritario a todas las áreas',
      'Plan de entrenamiento personalizado',
      'Asesoría nutricional',
      'Seguimiento avanzado de progreso',
      'Evaluaciones físicas periódicas',
      'Clases grupales premium',
      'Beneficios y descuentos exclusivos',
      'Soporte personalizado'
    ]
  }
};

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

  plans = signal<PlanDisplay[]>([
    { idMembresia: 1, precio: 89900, ...DEFAULT_PLANS_DATA['bronce'] },
    { idMembresia: 2, precio: 159900, ...DEFAULT_PLANS_DATA['plata'] },
    { idMembresia: 3, precio: 279900, ...DEFAULT_PLANS_DATA['oro'] }
  ]);
  isAnnual = signal<boolean>(false);

  toggleBilling() {
    this.isAnnual.set(!this.isAnnual());
  }

  ngOnInit() {
    this.membershipService.getMemberships().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const mapped = data.map(item => this.enrichMembership(item));
          this.plans.set(mapped);
        }
      },
      error: (err) => {
        console.error('API Error fetching plans:', err);
      }
    });
  }

  private enrichMembership(apiItem: Membership): PlanDisplay {
    const nameLower = apiItem.nombre.toLowerCase();
    let key: 'bronce' | 'plata' | 'oro' = 'bronce';
    if (nameLower.includes('oro') || nameLower.includes('vip') || nameLower.includes('elite')) {
      key = 'oro';
    } else if (nameLower.includes('plata') || nameLower.includes('warrior')) {
      key = 'plata';
    }

    const meta = DEFAULT_PLANS_DATA[key];
    return {
      idMembresia: apiItem.idMembresia,
      nombre: apiItem.nombre,
      precio: apiItem.precio || (key === 'bronce' ? 89900 : key === 'plata' ? 159900 : 279900),
      descripcion: meta.descripcion,
      badge: meta.badge,
      tier: key,
      icon: meta.icon,
      beneficios: meta.beneficios
    };
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

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
      if (target.parentElement) {
        target.parentElement.innerHTML = '<span style="font-size: 2.5rem; line-height: 1;">👑</span>';
      }
    }
  }
}

