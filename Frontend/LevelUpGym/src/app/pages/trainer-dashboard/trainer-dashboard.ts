import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ClassSessionService, ClassSession } from '../../services/class-session.service';
import { GoalTypeAdminService, GoalTypeAdmin } from '../../services/goal-type-admin.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trainer-dashboard.html',
  styleUrl: './trainer-dashboard.css'
})
export class TrainerDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertService = inject(AlertService);
  private classService = inject(ClassSessionService);
  private goalTypeService = inject(GoalTypeAdminService);

  activeTab = 'clases';

  classes = signal<ClassSession[]>([]);
  goalTypes = signal<GoalTypeAdmin[]>([]);

  ngOnInit() {
    // Para prototipo/panel de entrenador: permite acceso al panel
    this.loadClasses();
    this.loadGoalTypes();
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

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'clases') {
      this.loadClasses();
    } else if (tab === 'objetivos') {
      this.loadGoalTypes();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
