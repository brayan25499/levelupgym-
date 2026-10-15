import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Membership {
  idMembresia: number;
  nombre: string;
  precio: number;
  descripcion: string;
  estado: string;
}

export interface UpgradeCalculation {
  idPlanActual?: number | null;
  nombrePlanActual: string;
  valorPlanActual: number;
  idNuevoPlan: number;
  nombreNuevoPlan: string;
  precioNuevoPlan: number;
  excedenteAPagar: number;
  esUpgrade: boolean;
  mensaje: string;
}

export interface ProcessPaymentRequest {
  newPlanId: number;
  paymentMethod: string; // 'PSE' or 'TARJETA'
  bankName?: string;
  personType?: string; // 'NATURAL' | 'JURIDICA'
  cardHolder?: string;
  cardLast4?: string;
  referenceId?: string;
}

export interface PaymentResultResponse {
  status: string; // 'APPROVED', 'PENDING', 'DECLINED', 'CANCELLED'
  referenceId: string;
  planName: string;
  amountPaid: number;
  paymentMethod: string;
  bankName?: string;
  message: string;
  isUpgrade: boolean;
  previousPlanName?: string;
  expiresAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/memberships`;

  getMemberships(): Observable<Membership[]> {
    return this.http.get<Membership[]>(this.apiUrl);
  }

  buyMembership(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/purchase/${id}`, {});
  }

  calculateUpgrade(newPlanId: number): Observable<UpgradeCalculation> {
    return this.http.get<UpgradeCalculation>(`${this.apiUrl}/calculate-upgrade/${newPlanId}`);
  }

  upgradeMembership(newPlanId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/upgrade/${newPlanId}`, {});
  }

  processPayment(req: ProcessPaymentRequest): Observable<PaymentResultResponse> {
    return this.http.post<PaymentResultResponse>(`${this.apiUrl}/process-payment`, req);
  }
}