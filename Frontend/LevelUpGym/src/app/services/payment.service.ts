import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, switchMap, takeWhile, map, share } from 'rxjs';
import { environment } from '../../environments/environment';

// ── DTOs para PaymentsController ──

export interface CreatePaymentSessionRequest {
  planId: number;
  paymentMethod: 'PSE' | 'TARJETA';
  bankName?: string;
  personType?: 'NATURAL' | 'JURIDICA';
  cardHolder?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
}

export interface PaymentSessionResponse {
  referenceId: string;
  redirectUrl: string;
  amount: number;
  currency: string;
  status: string;
  integritySignature: string;
  planName: string;
  isUpgrade: boolean;
  message: string;
}

export interface PaymentStatusResponse {
  referenceId: string;
  status: string; // PROCESANDO | APROBADO | RECHAZADO | CANCELADO
  amount: number;
  planName: string;
  paymentMethod: string;
  paymentDate: string | null;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/payments`;

  /**
   * Crea una sesión de pago asíncrona en el backend.
   * Genera Venta, VentaDetalle, Pago y Suscripción en estado PENDIENTE.
   */
  createPaymentSession(request: CreatePaymentSessionRequest): Observable<PaymentSessionResponse> {
    return this.http.post<PaymentSessionResponse>(`${this.apiUrl}/create-session`, request);
  }

  /**
   * Consulta el estado de un pago por su referencia.
   * Se usa para polling desde el frontend después de que el usuario completa el pago.
   */
  getPaymentStatus(referenceId: string): Observable<PaymentStatusResponse> {
    return this.http.get<PaymentStatusResponse>(`${this.apiUrl}/status/${referenceId}`);
  }

  /**
   * Polling automático del estado del pago cada `intervalMs` milisegundos.
   * Se detiene cuando el estado ya no es "PROCESANDO" o al llegar a `maxAttempts`.
   */
  pollPaymentStatus(referenceId: string, intervalMs: number = 3000, maxAttempts: number = 40): Observable<PaymentStatusResponse> {
    let attempts = 0;
    return timer(0, intervalMs).pipe(
      takeWhile(() => attempts < maxAttempts),
      switchMap(() => {
        attempts++;
        return this.getPaymentStatus(referenceId);
      }),
      takeWhile(
        (response) => response.status === 'PROCESANDO',
        true // inclusive: emite el último valor que NO cumple la condición
      ),
      share()
    );
  }

  /**
   * Simula un webhook de confirmación de pago (para demo/testing).
   * En producción, esto lo envía la pasarela real.
   */
  simulateWebhookApproval(referenceId: string, amountInCents: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/webhook`, {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: `sim-${Date.now()}`,
          reference: referenceId,
          status: 'APPROVED',
          amountInCents: amountInCents,
          amount_in_cents: amountInCents,
          paymentMethodType: 'PSE',
          payment_method_type: 'PSE'
        }
      },
      signature: '' // El backend acepta sin firma para demo
    });
  }

  /**
   * Simula un webhook de pago rechazado (para demo/testing de error o fondos insuficientes).
   */
  simulateWebhookDecline(referenceId: string, amountInCents: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/webhook`, {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: `sim-${Date.now()}`,
          reference: referenceId,
          status: 'DECLINED',
          amountInCents: amountInCents,
          amount_in_cents: amountInCents,
          paymentMethodType: 'CARD',
          payment_method_type: 'CARD'
        }
      },
      signature: ''
    });
  }
}
