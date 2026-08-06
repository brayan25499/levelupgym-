import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);

  clients = signal<any[]>([]);
  sales = signal<any[]>([]);
  productsCount = signal<number>(0);
  
  totalRevenue = signal<number>(0);
  newMembersCount = signal<number>(0);
  machinesList = signal<any[]>([]);
  machinesCount = signal<number>(0);

  activeTab = 'resumen';

  // Form para agregar máquinas
  newMachine = {
    nombre: '',
    descripcion: '',
    precioVenta: 0,
    estado: 'ACTIVO'
  };

  ngOnInit() {
    if (!this.authService.currentUser()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadStats();
  }

  loadStats() {
    // Fetch clients
    this.http.get<any[]>(`${environment.apiUrl}/clients`).subscribe({
      next: (data) => {
        this.clients.set(data);
        this.newMembersCount.set(data.length);
      }
    });

    // Fetch sales
    this.http.get<any[]>(`${environment.apiUrl}/sales/all`).subscribe({
      next: (data) => {
        this.sales.set(data);
        const revenue = data.reduce((acc, curr) => acc + (curr.total || 0), 0);
        this.totalRevenue.set(revenue);
      }
    });

    // Fetch products and filter machines
    this.http.get<any[]>(`${environment.apiUrl}/products`).subscribe({
      next: (data) => {
        this.productsCount.set(data.length);
        const machines = data.filter(p => p.category?.nombre === 'Máquinas' || p.nombre?.toLowerCase().includes('caminadora') || p.nombre?.toLowerCase().includes('prensa') || p.nombre?.toLowerCase().includes('rack') || p.nombre?.toLowerCase().includes('bicicleta') || p.nombre?.toLowerCase().includes('máquina'));
        this.machinesList.set(machines);
        this.machinesCount.set(machines.length);
      }
    });
  }

  addMachine() {
    if (!this.newMachine.nombre.trim()) return;

    // Obtener categoría máquinas o asignar por omisión
    this.http.get<any[]>(`${environment.apiUrl}/products`).subscribe({
      next: (products) => {
        const catMacId = products.find(p => p.category?.nombre === 'Máquinas')?.idCategoria || 4;
        
        const payload = {
          nombre: this.newMachine.nombre,
          descripcion: this.newMachine.descripcion || 'Equipamiento de gimnasio',
          precioVenta: this.newMachine.precioVenta || 0,
          idCategoria: catMacId,
          estado: 'ACTIVO'
        };

        this.http.post(`${environment.apiUrl}/products`, payload).subscribe({
          next: () => {
            this.newMachine = { nombre: '', descripcion: '', precioVenta: 0, estado: 'ACTIVO' };
            this.loadStats();
          }
        });
      }
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
