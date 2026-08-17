import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClassSessionService, ClassSession, CreateClassSession } from '../../services/class-session.service';
import { EntrenadorService, Entrenador } from '../../services/entrenador.service';

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

  clients = signal<any[]>([]);
  totalRevenue = signal<number>(0);
  newMembersCount = signal<number>(0);
  
  classes = signal<ClassSession[]>([]);
  trainers = signal<Entrenador[]>([]);
  showNewClassModal = signal<boolean>(false);

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

    // Load Trainers
    this.trainerService.getEntrenadores().subscribe(data => {
      this.trainers.set(data);
    });

    // Load Classes
    this.loadClasses();

    // Revenue information unavailable after store removal
    this.totalRevenue.set(0);
  }

  loadClasses() {
    this.classService.getClasses().subscribe(data => {
      this.classes.set(data);
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
        },
        error: (err) => alert('Error creando clase')
      });
    }
  }

  deleteClass(id: number) {
    if (confirm('¿Seguro que deseas cancelar esta clase?')) {
      this.classService.deleteClass(id).subscribe({
        next: () => this.loadClasses(),
        error: () => alert('Error cancelando clase')
      });
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
