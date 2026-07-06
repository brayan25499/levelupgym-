import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { MembershipService, Membership } from '../../services/membership';
import { AlertService } from '../../services/alert.service';
import { Mannequin3DComponent } from '../../components/mannequin-3d/mannequin-3d.component';
import { DEFAULT_MUSCLES } from '../../components/mannequin-3d/models/muscle.model';

interface Exercise {
  name: string;
  desc: string;
  level: string;
  series?: string;
  reps?: string;
  media: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, Mannequin3DComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  membershipService = inject(MembershipService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  user = this.authService.currentUser;
  profileData = signal<any>(null);
  availablePlans = signal<Membership[]>([
    { idMembresia: 1, nombre: 'Bronce', precio: 89900, descripcion: 'Acceso básico a sala de pesas', estado: 'ACTIVO' },
    { idMembresia: 2, nombre: 'Plata', precio: 159900, descripcion: 'Acceso total + Clases grupales', estado: 'ACTIVO' },
    { idMembresia: 3, nombre: 'Oro', precio: 279900, descripcion: 'VIP: Todo incluido + Nutricionista', estado: 'ACTIVO' }
  ]);
  activeSection = 'inicio';
  today = new Date();
  
  // Checkout & Payment properties
  showPaymentModal = false;
  isProcessingPayment = false;
  selectedPlanToBuy: Membership | null = null;
  paymentMethod = 'tarjeta'; // 'tarjeta' | 'pse' | 'nequi' | 'paypal' | 'stripe' | 'mercado'
  
  // PSE / Nequi / Card dummy fields
  cardName = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  pseBank = '';
  nequiPhone = '';

  showDeleteConfirmModal = false;

  lastReceipt = signal<any>(null);
  showReceiptModal = signal<boolean>(false);

  // Mannequin interactive properties
  selectedMuscle = '';
  muscleExercises: any[] = [];
  muscleDescription = '';

  private exerciseData: Record<string, { desc: string; list: Exercise[] }> = {
    'Pectorales': {
      desc: 'Músculos del pecho responsables de la aducción y rotación interna del brazo.',
      list: [
        { name: 'Press de Banca con Barra', desc: 'Acostado en un banco plano, empuja la barra hacia arriba desde el pecho.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
        { name: 'Aperturas con Mancuernas', desc: 'Abre los brazos en arco sobre un banco plano para estirar las fibras del pecho.', level: 'Intermedio', media: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' }
      ]
    },
    'Deltoides': {
      desc: 'Músculos del hombro que permiten levantar y rotar los brazos en múltiples direcciones.',
      list: [
        { name: 'Press Militar con Mancuernas', desc: 'Empuja las mancuernas verticalmente sobre los hombros sentado o de pie.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80' },
        { name: 'Elevaciones Laterales', desc: 'Levanta las mancuernas hacia los lados manteniendo una ligera flexión en los codos.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80' }
      ]
    },
    'Bíceps': {
      desc: 'Músculo frontal del brazo responsable de la flexión del codo y supinación del antebrazo.',
      list: [
        { name: 'Curl de Bíceps con Barra', desc: 'De pie, flexiona los codos levantando la barra hacia el pecho sin mover el torso.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80' },
        { name: 'Curl Martillo con Mancuernas', desc: 'Realiza el curl sosteniendo las mancuernas con agarre neutro para trabajar el braquial.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80' }
      ]
    },
    'Tríceps': {
      desc: 'Músculo posterior del brazo encargado de la extensión del codo.',
      list: [
        { name: 'Extensión en Polea Alta', desc: 'Empuja la barra o cuerda hacia abajo bloqueando los codos al final del recorrido.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&q=80' },
        { name: 'Fondos en Paralelas', desc: 'Baja tu cuerpo sosteniéndote de dos barras paralelas y empuja con fuerza hacia arriba.', level: 'Avanzado', media: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' }
      ]
    },
    'Antebrazos': {
      desc: 'Músculos de la sección inferior del brazo que controlan el agarre y movimiento de la muñeca.',
      list: [
        { name: 'Curl de Muñeca Pronado', desc: 'Apoya el antebrazo y flexiona la muñeca hacia arriba con una barra.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80' }
      ]
    },
    'Trapecios': {
      desc: 'Músculos de la parte superior de la espalda y cuello que asisten en el encogimiento de hombros.',
      list: [
        { name: 'Encogimientos con Mancuernas', desc: 'Sostén mancuernas pesadas a los lados y eleva los hombros verticalmente.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&q=80' }
      ]
    },
    'Dorsales': {
      desc: 'Músculos anchos de la espalda (lats) que dan la forma en V al torso.',
      list: [
        { name: 'Dominadas Pronas', desc: 'Cuelga de una barra y eleva tu cuerpo hasta pasar la barbilla sobre la barra.', level: 'Avanzado', media: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&q=80' },
        { name: 'Jalón al Pecho en Polea', desc: 'Sentado en la máquina, tira de la barra hacia el pecho inclinando levemente el torso.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80' }
      ]
    },
    'Espalda media': {
      desc: 'Zona muscular interescapular clave para una postura erguida y densidad de espalda.',
      list: [
        { name: 'Remo con Barra', desc: 'Inclina el torso a 45 grados y jala la barra hacia tu abdomen bajo.', level: 'Intermedio', media: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' }
      ]
    },
    'Lumbares': {
      desc: 'Músculos de la espalda baja encargados de la extensión del torso y estabilidad del núcleo.',
      list: [
        { name: 'Hiperextensiones', desc: 'Colócate en el banco romano y eleva el torso manteniendo la espalda recta.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80' }
      ]
    },
    'Abdominales': {
      desc: 'Músculos frontales del abdomen que flexionan la columna y estabilizan la pelvis.',
      list: [
        { name: 'Crunch Abdominal', desc: 'Acostado boca arriba con rodillas dobladas, eleva los hombros contrayendo el abdomen.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
        { name: 'Plancha Abdominal Estática', desc: 'Apóyate en codos y puntas de pie manteniendo el cuerpo recto y el abdomen tenso.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80' }
      ]
    },
    'Oblicuos': {
      desc: 'Músculos laterales del abdomen encargados de la rotación y flexión lateral del torso.',
      list: [
        { name: 'Giros Rusos', desc: 'Sentado con rodillas semiflexionadas, gira el torso sosteniendo un disco o mancuerna.', level: 'Intermedio', media: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80' }
      ]
    },
    'Glúteos': {
      desc: 'Músculos más potentes de la cadera, esenciales para la extensión y estabilización.',
      list: [
        { name: 'Hip Thrust con Barra', desc: 'Apoya la espalda alta en un banco, coloca la barra en la cadera y empújala hacia arriba.', level: 'Intermedio', media: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&q=80' }
      ]
    },
    'Cuádriceps': {
      desc: 'Músculos frontales del muslo responsables de la extensión de la rodilla.',
      list: [
        { name: 'Sentadilla Libre con Barra', desc: 'Coloca la barra tras la nuca, baja la cadera rompiendo el paralelo y sube con fuerza.', level: 'Intermedio', media: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
        { name: 'Prensa de Piernas', desc: 'Empuja la plataforma cargada con peso extendiendo las rodillas sin llegar a bloquearlas.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80' }
      ]
    },
    'Isquiotibiales': {
      desc: 'Músculos traseros del muslo responsables de la flexión de rodilla y extensión de cadera.',
      list: [
        { name: 'Peso Muerto Rumano', desc: 'Desciende la barra rozando tus piernas manteniendo rodillas semiflexionadas para estirar los isquios.', level: 'Intermedio', media: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80' }
      ]
    },
    'Aductores': {
      desc: 'Músculos de la cara interna del muslo responsables de llevar la pierna hacia el eje central corporal.',
      list: [
        { name: 'Aductores en Máquina', desc: 'Sentado en la máquina, cierra los soportes presionando con la cara interna del muslo.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80' }
      ]
    },
    'Pantorrillas': {
      desc: 'Músculos de la pantorrilla encargados de la flexión plantar del pie.',
      list: [
        { name: 'Elevación de Talones de Pie', desc: 'Párate sobre un escalón y eleva los talones al máximo contrayendo gemelos.', level: 'Principiante', media: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80' }
      ]
    }
  };

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['section']) {
        this.activeSection = params['section'];
      }
    });
    this.fetchProfile();
    this.fetchPlans();

    // Default muscle exercises load
    this.onMuscleSelected('Pectorales');
  }

  fetchProfile() {
    this.authService.getProfile().subscribe({
      next: (res) => {
        // Mock detailed session and benefit data for active memberships
        if (res && res.activeMembership) {
          const planName = res.activeMembership.nombre.toLowerCase();
          let totalSessions = 20;
          let usedSessions = 8;
          let benefits = [
            'Acceso ilimitado al gimnasio',
            'Rutinas personalizadas',
            'Duchas',
            'Casilleros'
          ];

          if (planName === 'plata') {
            totalSessions = 30;
            usedSessions = 12;
            benefits.push('Entrenador personalizado', 'Acceso a clases grupales');
          } else if (planName === 'oro') {
            totalSessions = 9999; // Unlimited
            usedSessions = 14;
            benefits.push('Entrenador personalizado', 'Acceso a clases grupales', 'Evaluación física', 'VIP Acceso Nutricionista');
          }

          res.activeMembership = {
            ...res.activeMembership,
            sesionesTotales: totalSessions,
            sesionesUsadas: usedSessions,
            sesionesRestantes: totalSessions === 9999 ? 'Ilimitadas' : (totalSessions - usedSessions),
            beneficios: benefits
          };
        }
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
        if (res && res.length > 0) {
          this.availablePlans.set(res);
        }
      },
      error: (err) => {
        console.error('Error fetching memberships', err);
      }
    });
  }

  setSection(section: string) {
    this.activeSection = section;
  }

  // Modern Checkout Flow
  buyPlan(id: number) {
    const plan = this.availablePlans().find(p => p.idMembresia === id);
    if (plan) {
      this.selectedPlanToBuy = plan;
      this.showPaymentModal = true;
    }
  }

  processPayment() {
    if (!this.selectedPlanToBuy) return;
    this.isProcessingPayment = true;

    // Simulate API Gateway payment processing
    setTimeout(() => {
      this.membershipService.buyMembership(this.selectedPlanToBuy!.idMembresia).subscribe({
        next: (res) => {
          this.isProcessingPayment = false;
          this.showPaymentModal = false;
          
          this.lastReceipt.set({
            idTransaccion: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
            fecha: new Date(),
            nombreCliente: (this.profileData()?.nombre || '') + ' ' + (this.profileData()?.apellidos || ''),
            planNombre: this.selectedPlanToBuy!.nombre || 'Plan Gym',
            total: this.selectedPlanToBuy!.precio || 0,
            metodoPago: this.getPaymentMethodLabel(),
            vigencia: '1 Mes (Hasta ' + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() + ')'
          });

          this.fetchProfile();
          this.showReceiptModal.set(true);
          this.alertService.success('¡Membresía adquirida con éxito!', 'Pago Aprobado');
          this.activeSection = 'membresia';

          // Reset fields
          this.selectedPlanToBuy = null;
          this.cardNumber = '';
          this.cardExpiry = '';
          this.cardCvv = '';
          this.nequiPhone = '';
        },
        error: (err) => {
          this.isProcessingPayment = false;
          this.alertService.error('Error al adquirir membresía: ' + (err.error?.message || err.message || err.error));
        }
      });
    }, 2000);
  }

  getPaymentMethodLabel(): string {
    switch (this.paymentMethod) {
      case 'tarjeta': return 'Tarjeta de Crédito / Débito';
      case 'pse': return 'PSE (' + (this.pseBank || 'Banco Seleccionado') + ')';
      case 'nequi': return 'Nequi (Cel: ' + this.nequiPhone + ')';
      case 'paypal': return 'PayPal';
      case 'stripe': return 'Stripe Gateway';
      case 'mercado': return 'Mercado Pago';
      default: return 'Pasarela de Pago Electrónico';
    }
  }

  onMuscleSelected(muscle: any) {
    if (typeof muscle === 'string') {
      const foundMuscle = DEFAULT_MUSCLES.find(m => m.name.toLowerCase() === muscle.toLowerCase() || m.id === muscle);
      if (foundMuscle) {
        this.selectedMuscle = foundMuscle.name;
        this.muscleDescription = foundMuscle.description + ' ' + foundMuscle.function;
        this.muscleExercises = foundMuscle.exercises || [];
      } else {
        this.selectedMuscle = muscle;
        this.muscleDescription = 'Músculos corporales. Selecciona un grupo muscular para ver rutinas.';
        this.muscleExercises = [];
      }
    } else if (muscle && typeof muscle === 'object') {
      this.selectedMuscle = muscle.name;
      this.muscleDescription = (muscle.description || '') + ' ' + (muscle.function || '');
      this.muscleExercises = muscle.exercises || [];
    } else {
      this.selectedMuscle = '';
      this.muscleDescription = 'Músculos corporales. Selecciona un grupo muscular para ver rutinas.';
      this.muscleExercises = [];
    }
  }

  onMuscleDeselected() {
    this.selectedMuscle = '';
    this.muscleDescription = 'Músculos corporales. Selecciona un grupo muscular para ver rutinas.';
    this.muscleExercises = [];
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
