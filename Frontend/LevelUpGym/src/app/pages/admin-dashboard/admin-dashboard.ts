import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
  storeSalesRevenue = signal<number>(0);

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

    // Fetch sales
    this.http.get<any[]>('http://localhost:5143/api/sales/all').subscribe({
      next: (data) => {
        this.sales.set(data);
        const revenue = data.reduce((acc, curr) => acc + (curr.total || 0), 0);
        this.totalRevenue.set(revenue);
      }
    });

    // Fetch products count
    this.http.get<any[]>('http://localhost:5143/api/products').subscribe({
      next: (data) => {
        this.productsCount.set(data.length);
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
