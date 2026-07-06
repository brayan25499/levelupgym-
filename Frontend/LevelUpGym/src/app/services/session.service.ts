import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth';
import { AlertService } from './alert.service';
import { fromEvent, throttleTime } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  // Time constants in milliseconds
  private readonly INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
  private readonly WARNING_LIMIT = 25 * 60 * 1000;    // 25 minutes
  private readonly SILENT_RENEW_LIMIT = 20 * 60 * 1000; // 20 minutes (silent renewal while active)

  private lastActivityTime = Date.now();
  private lastRefreshTime = Date.now();
  private checkIntervalId: any;

  // Signal for UI warning modal
  showWarningModal = signal<boolean>(false);

  constructor() {
    this.setupActivityListeners();
    this.startSessionMonitor();
  }

  private setupActivityListeners(): void {
    // Monitor key events to reset inactivity timer (throttled to avoid heavy load)
    const events = ['mousemove', 'click', 'keypress', 'scroll', 'touchstart'];
    events.forEach(eventName => {
      fromEvent(window, eventName)
        .pipe(throttleTime(2000))
        .subscribe(() => this.onUserActivity());
    });
  }

  private onUserActivity(): void {
    this.lastActivityTime = Date.now();

    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    const isRemembered = localStorage.getItem('user') !== null;
    const timeSinceRefresh = Date.now() - this.lastRefreshTime;

    // Silent renewal: If user is active and token is older than 20 minutes, renew silently
    if (!isRemembered && timeSinceRefresh > this.SILENT_RENEW_LIMIT) {
      this.renewSession();
    }
  }

  private startSessionMonitor(): void {
    if (this.checkIntervalId) clearInterval(this.checkIntervalId);

    this.checkIntervalId = setInterval(() => {
      const currentUser = this.authService.currentUser();
      if (!currentUser) return;

      const isRemembered = localStorage.getItem('user') !== null;

      // Expiry checks only apply if NOT remembered (since remembered has 30 days Refresh Token validity)
      if (!isRemembered) {
        const inactiveTime = Date.now() - this.lastActivityTime;

        if (inactiveTime >= this.INACTIVITY_LIMIT) {
          this.handleSessionExpired();
        } else if (inactiveTime >= this.WARNING_LIMIT) {
          // Open warning popup 5 minutes before expiration
          if (!this.showWarningModal()) {
            this.showWarningModal.set(true);
          }
        } else {
          // Auto close warning if user becomes active again
          if (this.showWarningModal()) {
            this.showWarningModal.set(false);
          }
        }
      } else {
        // If remembered, renew access token silently if it's nearing 30 mins
        const timeSinceRefresh = Date.now() - this.lastRefreshTime;
        if (timeSinceRefresh > this.SILENT_RENEW_LIMIT) {
          this.renewSession();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  renewSession(): void {
    const user = this.authService.currentUser();
    if (user && user.refreshToken) {
      this.authService.renewToken(user.refreshToken).subscribe({
        next: () => {
          this.lastRefreshTime = Date.now();
          this.lastActivityTime = Date.now();
          this.showWarningModal.set(false);
          console.log('[Session] Token renewed successfully.');
        },
        error: (err) => {
          console.error('[Session] Silent token renewal failed:', err);
          this.handleSessionExpired();
        }
      });
    } else {
      this.handleSessionExpired();
    }
  }

  closeSessionManual(): void {
    this.showWarningModal.set(false);
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private handleSessionExpired(): void {
    this.showWarningModal.set(false);
    this.authService.logout();
    clearInterval(this.checkIntervalId);
    
    // Redirect to login with query param to trigger friendly expired notice
    this.router.navigate(['/login'], { queryParams: { sessionExpired: 'true' } });
  }
}
