import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClassSessionService, ClassSession, CreateClassSession } from '../../services/class-session.service';
import { EntrenadorService, Entrenador, EntrenadorAdmin } from '../../services/entrenador.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertService = inject(AlertService);

  clients = signal<any[]>([]);
  totalRevenue = signal<number>(0);
  newMembersCount = signal<number>(0);
  
  classes = signal<ClassSession[]>([]);
  trainers = signal<Entrenador[]>([]);
  showNewClassModal = signal<boolean>(false);

  // Administrative Trainers State
  adminTrainers = signal<EntrenadorAdmin[]>([]);
  showTrainerModal = signal<boolean>(false);
  editingTrainerId = signal<number | null>(null);

  private fb = inject(FormBuilder);
  private classService = inject(ClassSessionService);
  private trainerService = inject(EntrenadorService);

  classForm: FormGroup = this.fb.group({
    idEntrenador: ['', Validators.required],
    nombre: ['', Validators.required],
    fecha: ['', Validators.required],
    horaInicio: ['', Validators.required],
    capacidadMaxima: [15, [Validators.required, Validators.min(1)]]
  });

  trainerForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    apellidos: ['', Validators.required],
    especialidad: ['', Validators.required],
    descripcion: [''],
    salarioBase: [0, [Validators.required, Validators.min(0)]],
    fechaContratacion: [''],
    estado: ['Activo']
  });

  activeTab = 'resumen';

  ngOnInit() {
    // Validate if logged-in user is admin
    const currentUser = this.authService.currentUser();
    if (!currentUser || currentUser.email !== 'admin@levelup.com') {
      this.router.navigate(['/login']);
      return;
    }

    this.loadStats();
  }

  loadStats() {
    // Fetch clients
    this.http.get<any[]>('http://localhost:5143/api/clients').subscribe({
      next: (data) => {
        this.clients.set(data);
        this.newMembersCount.set(data.length);
      }
    });

    // Load Trainers (for class selection dropdown)
    this.trainerService.getEntrenadores().subscribe(data => {
      this.trainers.set(data);
    });

    // Load Classes
    this.loadClasses();

    // If active tab is trainers, load admin trainers
    if (this.activeTab === 'entrenadores') {
      this.loadAdminTrainers();
    }

    // Revenue information unavailable after store removal
    this.totalRevenue.set(0);
  }

  loadClasses() {
    this.classService.getClasses().subscribe(data => {
      this.classes.set(data);
    });
  }

  loadAdminTrainers() {
    this.trainerService.getEntrenadoresAdmin().subscribe({
      next: (data) => {
        this.adminTrainers.set(data);
      },
      error: () => this.alertService.error('Error al cargar la lista de entrenadores.')
    });
  }

  openNewClassModal() {
    this.classForm.reset({ capacidadMaxima: 15 });
    this.showNewClassModal.set(true);
  }

  closeNewClassModal() {
    this.showNewClassModal.set(false);
  }

  createClass() {
    if (this.classForm.valid) {
      this.classService.createClass(this.classForm.value).subscribe({
        next: () => {
          this.loadClasses();
          this.closeNewClassModal();
          this.alertService.success('Clase creada correctamente.');
        },
        error: (err) => this.alertService.error('Error creando clase')
      });
    }
  }

  deleteClass(id: number) {
    this.alertService.confirm('¿Seguro que deseas cancelar esta clase?', () => {
      this.classService.deleteClass(id).subscribe({
        next: () => {
          this.loadClasses();
          this.alertService.success('Clase cancelada correctamente.');
        },
        error: () => this.alertService.error('Error cancelando clase')
      });
    });
  }

  // Trainer Modal Actions
  openNewTrainerModal() {
    this.editingTrainerId.set(null);
    this.trainerForm.reset({
      nombre: '',
      apellidos: '',
      especialidad: '',
      descripcion: '',
      salarioBase: 0,
      fechaContratacion: '',
      estado: 'Activo'
    });
    this.showTrainerModal.set(true);
  }

  openEditTrainerModal(id: number) {
    this.editingTrainerId.set(id);
    this.trainerService.getEntrenadorById(id).subscribe({
      next: (t) => {
        this.trainerForm.patchValue({
          nombre: t.nombre,
          apellidos: t.apellidos,
          especialidad: t.especialidad,
          descripcion: t.descripcion,
          salarioBase: t.salarioBase,
          fechaContratacion: t.fechaContratacion,
          estado: t.estado
        });
        this.showTrainerModal.set(true);
      },
      error: () => this.alertService.error('Error al cargar datos del entrenador.')
    });
  }

  closeTrainerModal() {
    this.showTrainerModal.set(false);
    this.editingTrainerId.set(null);
  }

  saveTrainer() {
    if (this.trainerForm.invalid) return;

    const data = this.trainerForm.value;
    const id = this.editingTrainerId();

    if (id) {
      this.trainerService.updateEntrenador(id, data).subscribe({
        next: () => {
          this.alertService.success('Entrenador actualizado correctamente.');
          this.loadAdminTrainers();
          // Reload public list for dropdowns
          this.trainerService.getEntrenadores().subscribe(list => this.trainers.set(list));
          this.closeTrainerModal();
        },
        error: (err) => this.alertService.error(err.error?.message || 'Error al actualizar entrenador.')
      });
    } else {
      this.trainerService.createEntrenador(data).subscribe({
        next: () => {
          this.alertService.success('Entrenador creado correctamente.');
          this.loadAdminTrainers();
          // Reload public list for dropdowns
          this.trainerService.getEntrenadores().subscribe(list => this.trainers.set(list));
          this.closeTrainerModal();
        },
        error: (err) => this.alertService.error(err.error?.message || 'Error al crear entrenador.')
      });
    }
  }

  deleteTrainer(id: number) {
    this.alertService.confirm('¿Seguro que deseas eliminar a este entrenador?', () => {
      this.trainerService.deleteEntrenador(id).subscribe({
        next: () => {
          this.alertService.success('Entrenador eliminado correctamente.');
          this.loadAdminTrainers();
          // Reload public list for dropdowns
          this.trainerService.getEntrenadores().subscribe(list => this.trainers.set(list));
        },
        error: (err) => this.alertService.error(err.error?.message || 'Error al eliminar entrenador.')
      });
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'entrenadores') {
      this.loadAdminTrainers();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
