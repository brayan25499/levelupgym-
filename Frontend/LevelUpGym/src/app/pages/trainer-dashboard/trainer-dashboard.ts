import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ClassSessionService, ClassSession } from '../../services/class-session.service';
import { GoalTypeAdminService, GoalTypeAdmin } from '../../services/goal-type-admin.service';
import { EntrenadorService, Entrenador } from '../../services/entrenador.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './trainer-dashboard.html',
  styleUrl: './trainer-dashboard.css'
})
export class TrainerDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private classService = inject(ClassSessionService);
  private goalTypeService = inject(GoalTypeAdminService);
  private trainerService = inject(EntrenadorService);

  activeTab = 'clases';

  classes = signal<ClassSession[]>([]);
  goalTypes = signal<GoalTypeAdmin[]>([]);
  trainers = signal<Entrenador[]>([]);

  // Modales
  showNewClassModal = signal<boolean>(false);
  showGoalTypeModal = signal<boolean>(false);

  // Formularios
  classForm: FormGroup = this.fb.group({
    idEntrenador: ['', Validators.required],
    nombre: ['', Validators.required],
    fecha: ['', Validators.required],
    horaInicio: ['', Validators.required],
    capacidadMaxima: [15, [Validators.required, Validators.min(1)]]
  });

  goalTypeForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    unidad: ['', Validators.required],
    tipoDato: ['DECIMAL', Validators.required],
    direccion: ['MENOR', Validators.required],
    activo: [true]
  });

  ngOnInit() {
    this.loadClasses();
    this.loadGoalTypes();
    this.loadTrainers();
  }

  loadClasses() {
    this.classService.getClasses().subscribe({
      next: (data) => this.classes.set(data),
      error: () => this.alertService.error('Error al cargar la lista de clases.')
    });
  }

  loadGoalTypes() {
    this.goalTypeService.getAll().subscribe({
      next: (data) => this.goalTypes.set(data),
      error: () => this.alertService.error('Error al cargar la lista de objetivos.')
    });
  }

  loadTrainers() {
    this.trainerService.getEntrenadores().subscribe({
      next: (data) => this.trainers.set(data),
      error: () => this.alertService.error('Error al cargar entrenadores.')
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'clases') {
      this.loadClasses();
    } else if (tab === 'objetivos') {
      this.loadGoalTypes();
    }
  }

  // --- CRUD CLASES (Solo agregar) ---
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
        error: () => this.alertService.error('Error creando clase')
      });
    }
  }
  deleteClass(c: ClassSession) {
    const inscritosMsg = c.inscritos && c.inscritos > 0 ? ` Tiene ${c.inscritos} inscrito(s).` : '';
    const confirmMsg = `¿Seguro que quieres cancelar esta clase?${inscritosMsg}`;

    this.alertService.confirm(confirmMsg, () => {
      this.classService.deleteClass(c.idClass).subscribe({
        next: () => {
          this.loadClasses();
          this.alertService.success('Clase cancelada correctamente.');
        },
        error: () => this.alertService.error('Error cancelando clase')
      });
    });
  }

  // --- CRUD OBJETIVOS (Solo agregar) ---
  openNewGoalTypeModal() {
    this.goalTypeForm.reset({
      nombre: '',
      descripcion: '',
      unidad: '',
      tipoDato: 'DECIMAL',
      direccion: 'MENOR',
      activo: true
    });
    this.showGoalTypeModal.set(true);
  }

  closeGoalTypeModal() {
    this.showGoalTypeModal.set(false);
  }

  saveGoalType() {
    if (this.goalTypeForm.invalid) return;

    const data = this.goalTypeForm.value;
    this.goalTypeService.create(data).subscribe({
      next: () => {
        this.alertService.success('Tipo de objetivo creado.');
        this.loadGoalTypes();
        this.closeGoalTypeModal();
      },
      error: (err) => this.alertService.error(err.error?.message || 'Error al crear.')
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
