import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClassSessionService, ClassSession, CreateClassSession } from '../../services/class-session.service';
import { EntrenadorService, Entrenador, EntrenadorAdmin } from '../../services/entrenador.service';
import { GoalTypeAdminService, GoalTypeAdmin } from '../../services/goal-type-admin.service';
import { AlertService } from '../../services/alert.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);
  private classService = inject(ClassSessionService);
  private trainerService = inject(EntrenadorService);
  private goalTypeService = inject(GoalTypeAdminService);

  // ---- Referencias a los <canvas> de las gráficas ----
  @ViewChild('revenueChart') revenueChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('newClientsChart') newClientsChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('membershipChart') membershipChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('occupancyChart') occupancyChartRef?: ElementRef<HTMLCanvasElement>;

  private revenueChartInstance?: Chart;
  private newClientsChartInstance?: Chart;
  private membershipChartInstance?: Chart;
  private occupancyChartInstance?: Chart;

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

  // GoalTypes State
  goalTypes = signal<GoalTypeAdmin[]>([]);
  showGoalTypeModal = signal<boolean>(false);
  editingGoalTypeId = signal<number | null>(null);

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

  goalTypeForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    unidad: ['', Validators.required],
    tipoDato: ['DECIMAL', Validators.required],
    direccion: ['MENOR', Validators.required],
    activo: [true]
  });

  activeTab = 'resumen';

  ngOnInit() {
    const currentUser = this.authService.currentUser();
    if (!currentUser || currentUser.email !== 'admin@levelup.com') {
      this.router.navigate(['/login']);
      return;
    }
    this.loadStats();
  }

  ngAfterViewInit() {
    // La pestaña "resumen" es la que abre por defecto, así que las
    // gráficas se construyen apenas los datos estén listos.
    setTimeout(() => this.renderCharts(), 150);
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  loadStats() {
    this.http.get<any[]>('http://localhost:5143/api/clients').subscribe({
      next: (data) => {
        this.clients.set(data);
        this.newMembersCount.set(data.length);
        this.renderCharts();
      }
    });

    // Load Trainers (for class selection dropdown)
    this.trainerService.getEntrenadores().subscribe(data => {
      this.trainers.set(data);
    });

    this.loadClasses();

    // If active tab is trainers, load admin trainers
    if (this.activeTab === 'entrenadores') {
      this.loadAdminTrainers();
    }

    // El total real de ingresos se calcula en renderRevenueChart() contra
    // GET /api/admin/stats/revenue-by-month; esto solo fija un valor inicial.
    this.totalRevenue.set(0);
  }

  loadClasses() {
    this.classService.getClasses().subscribe(data => {
      this.classes.set(data);
      this.renderCharts();
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

  // =========================================================================
  // GRÁFICAS (Chart.js)
  // =========================================================================
  private renderCharts() {
    if (this.activeTab !== 'resumen') return;
    this.renderOccupancyChart();
    this.renderNewClientsChart();
    this.renderMembershipChart();
    this.renderRevenueChart();
  }

  private destroyCharts() {
    this.revenueChartInstance?.destroy();
    this.newClientsChartInstance?.destroy();
    this.membershipChartInstance?.destroy();
    this.occupancyChartInstance?.destroy();
    this.revenueChartInstance = undefined;
    this.newClientsChartInstance = undefined;
    this.membershipChartInstance = undefined;
    this.occupancyChartInstance = undefined;
  }

  private chartTheme = {
    grid: 'rgba(255,255,255,0.06)',
    text: '#8a8a8a',
    red: '#dc143c',
    redDark: '#8b0000',
    redSoft: 'rgba(220,20,60,0.35)',
    gold: '#ffd700',
    white: '#ffffff',
  };

  // ---- 1. Ocupación de clases (barras horizontales apiladas: inscritos vs cupos libres) — 100% datos reales ----
  private renderOccupancyChart() {
    const canvas = this.occupancyChartRef?.nativeElement;
    if (!canvas) return;
    this.occupancyChartInstance?.destroy();

    const data = this.classes();
    const labels = data.length ? data.map(c => c.nombre) : ['Sin clases'];
    const inscritos = data.length ? data.map(c => c.inscritos) : [0];
    const libres = data.length ? data.map(c => Math.max(c.capacidadMaxima - c.inscritos, 0)) : [0];

    this.occupancyChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Inscritos',
            data: inscritos,
            backgroundColor: this.chartTheme.red,
            stack: 'ocupacion',
            borderRadius: { topLeft: 4, bottomLeft: 4, topRight: 0, bottomRight: 0 },
            maxBarThickness: 28,
          },
          {
            label: 'Cupos libres',
            data: libres,
            backgroundColor: 'rgba(255,255,255,0.08)',
            stack: 'ocupacion',
            borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
            maxBarThickness: 28,
          }
        ]
      },
      options: {
        ...this.baseChartOptions(),
        indexAxis: 'y',
        scales: {
          x: { stacked: true, ticks: { color: this.chartTheme.text }, grid: { color: this.chartTheme.grid }, beginAtZero: true },
          y: { stacked: true, ticks: { color: this.chartTheme.text }, grid: { display: false } }
        }
      }
    });
  }

  // ---- 2. Clientes nuevos por mes ----
  private renderNewClientsChart() {
    const canvas = this.newClientsChartRef?.nativeElement;
    if (!canvas) return;
    this.newClientsChartInstance?.destroy();

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const counts: Record<string, number> = {};
    let hasDateField = false;

    for (const client of this.clients()) {
      const rawDate = client.fechaRegistro || client.profile?.fechaRegistro || client.createdAt;
      if (rawDate) {
        hasDateField = true;
        const d = new Date(rawDate);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    const labels = hasDateField ? Object.keys(counts) : ['Sin dato de fecha'];
    const values = hasDateField ? Object.values(counts) : [this.clients().length];

    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(220,20,60,0.45)');
    gradient.addColorStop(1, 'rgba(220,20,60,0)');

    const pointColors = values.map((_, i) => i === values.length - 1 ? this.chartTheme.gold : this.chartTheme.red);
    const pointRadii = values.map((_, i) => i === values.length - 1 ? 6 : 3);

    this.newClientsChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Clientes nuevos',
          data: values,
          borderColor: this.chartTheme.red,
          backgroundColor: gradient,
          tension: 0.4,
          fill: true,
          borderWidth: 2.5,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: pointRadii,
          pointHoverRadius: pointRadii.map(r => r + 2),
        }]
      },
      options: this.baseChartOptions()
    });
  }

  // ---- 3. Distribución de membresías (Bronce/Plata/Oro) ----
  private renderMembershipChart() {
    const canvas = this.membershipChartRef?.nativeElement;
    if (!canvas) return;
    this.membershipChartInstance?.destroy();

    const counts: Record<string, number> = { Bronce: 0, Plata: 0, Oro: 0, 'Sin membresía': 0 };

    for (const client of this.clients()) {
      const nombre: string = (client.membresiaActiva?.nombre || client.activeMembership?.nombre || '').toLowerCase();
      if (nombre.includes('oro') || nombre.includes('gold')) counts['Oro']++;
      else if (nombre.includes('plata') || nombre.includes('silver')) counts['Plata']++;
      else if (nombre.includes('bronce') || nombre.includes('bronze')) counts['Bronce']++;
      else counts['Sin membresía']++;
    }

    const centerTextPlugin = {
      id: 'centerText',
      afterDraw: (chart: any) => {
        const total = (chart.data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "700 28px 'Bebas Neue', sans-serif";
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(total), centerX, centerY - 6);
        ctx.font = "600 10px 'Barlow Condensed', sans-serif";
        ctx.fillStyle = '#888888';
        ctx.fillText('CLIENTES', centerX, centerY + 14);
        ctx.restore();
      }
    };

    this.membershipChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(counts),
        datasets: [{
          data: Object.values(counts),
          backgroundColor: ['#cd7f32', '#c0c0c0', this.chartTheme.gold, 'rgba(255,255,255,0.1)'],
          borderColor: '#0a0a0a',
          borderWidth: 3,
          hoverOffset: 8,
        }]
      },
      options: {
        ...this.baseChartOptions(),
        cutout: '70%',
        scales: undefined,
        plugins: {
          ...this.baseChartOptions().plugins,
          legend: {
            position: 'bottom',
            labels: {
              color: this.chartTheme.text,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: { family: 'Barlow, sans-serif', size: 12 }
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    });
  }

  // ---- 4. Ingresos por mes ----
  private renderRevenueChart() {
    const canvas = this.revenueChartRef?.nativeElement;
    if (!canvas) return;
    this.revenueChartInstance?.destroy();

    this.http.get<{ month: string; total: number }[]>('http://localhost:5143/api/admin/stats/revenue-by-month').subscribe({
      next: (data) => {
        this.totalRevenue.set(data.reduce((sum, d) => sum + d.total, 0));
        this.buildRevenueChart(canvas, data.map(d => d.month), data.map(d => d.total));
      },
      error: () => {
        // El endpoint todavía no existe o falló — se muestra vacío.
        this.buildRevenueChart(canvas, ['Sin datos de ingresos'], [0]);
      }
    });
  }

  private buildRevenueChart(canvas: HTMLCanvasElement, labels: string[], values: number[]) {
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, this.chartTheme.red);
    gradient.addColorStop(1, this.chartTheme.redDark);

    this.revenueChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Ingresos ($)',
            data: values,
            backgroundColor: gradient,
            borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 } as any,
            borderSkipped: false,
            maxBarThickness: 64,
            order: 2,
          },
          {
            type: 'line',
            label: 'Tendencia',
            data: values,
            borderColor: this.chartTheme.gold,
            backgroundColor: this.chartTheme.gold,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: this.chartTheme.gold,
            fill: false,
            order: 1,
          }
        ]
      },
      options: {
        ...this.baseChartOptions(),
        scales: {
          x: { ticks: { color: this.chartTheme.text }, grid: { color: this.chartTheme.grid } },
          y: {
            ticks: {
              color: this.chartTheme.text,
              callback: (value: any) => '$' + Number(value).toLocaleString('es-CO')
            },
            grid: { color: this.chartTheme.grid },
            beginAtZero: true
          }
        }
      }
    });
  }

  private baseChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: this.chartTheme.text, font: { family: 'Barlow, sans-serif' } } },
        tooltip: {
          backgroundColor: '#111111',
          titleColor: '#ffffff',
          titleFont: { family: 'Barlow Condensed, sans-serif', weight: '700' as any },
          bodyColor: '#cccccc',
          bodyFont: { family: 'Barlow, sans-serif' },
          borderColor: this.chartTheme.red,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 2,
          displayColors: true,
        }
      },
      scales: {
        x: { ticks: { color: this.chartTheme.text }, grid: { color: this.chartTheme.grid } },
        y: { ticks: { color: this.chartTheme.text }, grid: { color: this.chartTheme.grid }, beginAtZero: true }
      }
    };
  }

  // =========================================================================
  // CRUD DE CLASES
  // =========================================================================
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

  // =========================================================================
  // CRUD DE ENTRENADORES (admin)
  // =========================================================================
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

  // =========================================================================
  // CRUD DE TIPOS DE OBJETIVO (GoalTypes)
  // =========================================================================
  loadGoalTypes() {
    this.goalTypeService.getAll().subscribe({
      next: (data) => this.goalTypes.set(data),
      error: () => this.alertService.error('Error al cargar los tipos de objetivo.')
    });
  }

  openNewGoalTypeModal() {
    this.editingGoalTypeId.set(null);
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

  openEditGoalTypeModal(gt: GoalTypeAdmin) {
    this.editingGoalTypeId.set(gt.idTipoObjetivo);
    this.goalTypeForm.patchValue({
      nombre: gt.nombre,
      descripcion: gt.descripcion || '',
      unidad: gt.unidad,
      tipoDato: gt.tipoDato,
      direccion: gt.direccion,
      activo: gt.activo
    });
    this.showGoalTypeModal.set(true);
  }

  closeGoalTypeModal() {
    this.showGoalTypeModal.set(false);
    this.editingGoalTypeId.set(null);
  }

  saveGoalType() {
    if (this.goalTypeForm.invalid) return;

    const data = this.goalTypeForm.value;
    const id = this.editingGoalTypeId();

    if (id) {
      this.goalTypeService.update(id, data).subscribe({
        next: () => {
          this.alertService.success('Tipo de objetivo actualizado.');
          this.loadGoalTypes();
          this.closeGoalTypeModal();
        },
        error: (err) => this.alertService.error(err.error?.message || 'Error al actualizar.')
      });
    } else {
      this.goalTypeService.create(data).subscribe({
        next: () => {
          this.alertService.success('Tipo de objetivo creado.');
          this.loadGoalTypes();
          this.closeGoalTypeModal();
        },
        error: (err) => this.alertService.error(err.error?.message || 'Error al crear.')
      });
    }
  }

  toggleGoalTypeActive(gt: GoalTypeAdmin) {
    this.goalTypeService.toggleActive(gt.idTipoObjetivo).subscribe({
      next: () => {
        this.alertService.success(`Objetivo "${gt.nombre}" ${gt.activo ? 'desactivado' : 'activado'}.`);
        this.loadGoalTypes();
      },
      error: (err) => this.alertService.error(err.error?.message || 'Error al cambiar estado.')
    });
  }

  deleteGoalType(gt: GoalTypeAdmin) {
    this.alertService.confirm(`¿Eliminar el tipo de objetivo "${gt.nombre}"?`, () => {
      this.goalTypeService.delete(gt.idTipoObjetivo).subscribe({
        next: () => {
          this.alertService.success('Tipo de objetivo eliminado.');
          this.loadGoalTypes();
        },
        error: (err) => this.alertService.error(err.error?.message || 'Error al eliminar.')
      });
    });
  }

  // =========================================================================
  setTab(tab: string) {
    this.activeTab = tab;

    if (tab === 'resumen') {
      setTimeout(() => this.renderCharts(), 100);
    } else {
      this.destroyCharts();
    }

    if (tab === 'entrenadores') {
      this.loadAdminTrainers();
    }
    if (tab === 'objetivos') {
      this.loadGoalTypes();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}