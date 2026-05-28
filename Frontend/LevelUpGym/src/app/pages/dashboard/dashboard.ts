import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { MembershipService, Membership } from '../../services/membership';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  authService = inject(AuthService);
  cartService = inject(CartService);
  membershipService = inject(MembershipService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  user = this.authService.currentUser;
  profileData = signal<any>(null);
  availablePlans = signal<Membership[]>([]);
  activeSection = 'inicio';
  today = new Date();
  
  showPaymentModal = false;
  isProcessingPayment = false;
  showDeleteConfirmModal = false;

  lastReceipt = signal<any>(null);
  showReceiptModal = signal<boolean>(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['section']) {
        this.activeSection = params['section'];
      }
    });
    this.fetchProfile();
    this.fetchPlans();
  }

  fetchProfile() {
    this.authService.getProfile().subscribe({
      next: (res) => {
        this.profileData.set(res);
      },
      error: (err) => {
        console.error('Error fetching profile', err);
      }
    });
  }

  fetchPlans() {
    this.membershipService.getMemberships().subscribe({
      next: (res) => {
        this.availablePlans.set(res);
      },
      error: (err) => {
        console.error('Error fetching memberships', err);
      }
    });
  }

  setSection(section: string) {
    this.activeSection = section;
  }

  checkout() {
    this.showPaymentModal = true;
  }

  processPayment() {
    this.isProcessingPayment = true;
    
    // Simulate API Delay
    setTimeout(() => {
      this.cartService.checkout().subscribe({
        next: (res: any) => {
          this.isProcessingPayment = false;
          this.showPaymentModal = false;
          this.alertService.success('¡Pago exitoso! Gracias por tu compra.', 'Pago Exitoso');
          this.activeSection = 'inicio';
        },
        error: (err: any) => {
          this.isProcessingPayment = false;
          this.alertService.error('Error al procesar el pago. Intenta de nuevo.', 'Error de Pago');
        }
      });
    }, 2000);
  }

  updateProfile() {
    const data = this.profileData();
    if (!data) return;

    if (!data.nombre || !data.apellidos) {
      this.alertService.error('Nombre y Apellidos son requeridos.', 'Campos Incompletos');
      return;
    }

    if (data.telefono && !/^[0-9]{1,10}$/.test(data.telefono)) {
      this.alertService.error('El teléfono debe tener máximo 10 dígitos numéricos.', 'Error de Teléfono');
      return;
    }

    const payload = {
      nombre: data.nombre,
      apellidos: data.apellidos,
      telefono: data.telefono,
      sexo: data.sexo,
      peso: data.peso ? parseFloat(data.peso) : null,
      estatura: data.estatura ? parseFloat(data.estatura) : null
    };

    this.authService.updateProfile(payload).subscribe({
      next: (res) => {
        this.alertService.success(res.message || 'Perfil actualizado exitosamente.');
        this.fetchProfile();
      },
      error: (err) => {
        this.alertService.error('Error al actualizar datos: ' + (err.error?.message || err.message || err.error));
      }
    });
  }

  buyPlan(id: number) {
    this.membershipService.buyMembership(id).subscribe({
      next: (res) => {
        this.fetchProfile();
        const plan = this.availablePlans().find(p => p.idMembresia === id);
        this.lastReceipt.set({
          idTransaccion: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
          fecha: new Date(),
          nombreCliente: (this.profileData()?.nombre || '') + ' ' + (this.profileData()?.apellidos || ''),
          planNombre: plan?.nombre || 'Plan Gym',
          total: plan?.precio || 0,
          metodoPago: 'Tarjeta de Crédito (Pasarela Encriptada)',
          vigencia: '1 Mes (Hasta ' + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() + ')'
        });
        this.showReceiptModal.set(true);
        this.alertService.success('¡Membresía adquirida con éxito!');
        this.activeSection = 'membresia';
      },
      error: (err) => {
        this.alertService.error('Error al adquirir membresía: ' + (err.error?.message || err.message || err.error));
      }
    });
  }

  deleteProfileAccount() {
    this.authService.deleteAccount().subscribe({
      next: (res) => {
        this.alertService.success('Tu cuenta ha sido eliminada correctamente.');
        this.showDeleteConfirmModal = false;
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.alertService.error('Error al eliminar la cuenta: ' + (err.error?.message || err.message || err.error));
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

