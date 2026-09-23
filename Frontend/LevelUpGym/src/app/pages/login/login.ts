import { Component, inject, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../services/alert.service';
import { environment } from '../../../environments/environment';
import {
  loginEmailValidator,
  loginPasswordValidator
} from '../../validators/custom-validators';

declare const google: any;

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnDestroy, AfterViewInit {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  isLoading = false;
  errorMessage: string | null = null;

  // ===== Login Form =====

  loginForm = this.fb.group({
    email: ['', [Validators.required, loginEmailValidator()]],
    password: ['', [Validators.required, loginPasswordValidator()]],
  });

  // ===== Google Login State =====

  isGoogleLoading = false;
  private googleInitialized = false;

  // ===== Recovery Modal State =====

  showForgotModal = false;
  recoveryStep = 1;
  recoveryError: string | null = null;
  isRecoveryLoading = false;

  // Step 1
  recoveryEmail = '';
  recoveryEmailInputError: string | null = null;

  // Step 2
  maskedEmail = '';
  maskedPhone: string | null = null;
  hasPhone = false;
  selectedMedium: 'email' | 'phone' = 'email';

  // OTP
  otpDigits: string[] = ['', '', '', '', '', ''];
  otpHasError = false;
  otpTimerSeconds = 300;
  otpTimerDisplay = '5:00';
  otpTimerExpired = false;
  canResendOtp = false;
  resendCooldownDisplay = '60';

  private otpTimerInterval: any = null;
  private resendCooldownInterval: any = null;
  private resendCooldownSeconds = 60;

  // Password
  newPassword = '';
  confirmNewPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;

  // Redirect
  redirectCountdown = 3;
  private redirectInterval: any = null;

  // ===== Lifecycle =====

  ngAfterViewInit() {
    this.initGoogleSignIn();
  }

  // ===== Login =====

  onSubmit() {
    this.errorMessage = null;

    if (this.loginForm.valid) {
      this.isLoading = true;

      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.cdr.detectChanges();

          if (res.email === 'admin@levelup.com') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },

        error: (err) => {
          this.isLoading = false;

          const errorMsg =
            typeof err.error === 'string'
              ? err.error
              : (err.error?.message || '');

          if (
            errorMsg.includes('no encontrado') ||
            errorMsg.includes('Usuario')
          ) {
            this.errorMessage =
              'Usuario no encontrado. Verifica tu correo electrónico.';
          } else if (
            errorMsg.includes('Contraseña') ||
            errorMsg.includes('incorrecta') ||
            errorMsg.includes('password')
          ) {
            this.errorMessage =
              'Contraseña incorrecta. Inténtalo de nuevo.';
          } else {
            this.errorMessage =
              errorMsg ||
              'Error al iniciar sesión. Verifica tus credenciales.';
          }

          this.cdr.detectChanges();
        }
      });

    } else {
      this.loginForm.markAllAsTouched();
      this.cdr.detectChanges();
    }
  }

  // ===== Google Login =====

  private initGoogleSignIn() {
    if (this.googleInitialized) return;

    if (typeof google === 'undefined' || !google?.accounts?.id) {
      // El script de Google (accounts.google.com/gsi/client) aún no cargó.
      // Reintentamos brevemente por si el <script> del index.html llega después.
      setTimeout(() => this.initGoogleSignIn(), 300);
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.handleGoogleCredential(response),
    });

    const container = document.getElementById('google-btn-container');

    if (container) {
      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: 320,
      });
    }

    this.googleInitialized = true;
  }

  onGoogleLogin() {
    if (this.isGoogleLoading) return;

    // Disparamos el click sobre el botón real de Google (oculto),
    // para mantener nuestro botón con el estilo de LevelUpGym.
    const realGoogleButton = document.querySelector(
      '#google-btn-container div[role="button"]'
    ) as HTMLElement | null;

    if (realGoogleButton) {
      realGoogleButton.click();
    } else {
      this.errorMessage =
        'No fue posible iniciar sesión con Google. Intenta nuevamente.';
      this.cdr.detectChanges();
    }
  }

  private handleGoogleCredential(response: any) {
    this.errorMessage = null;
    this.isGoogleLoading = true;
    this.cdr.detectChanges();

    this.authService.googleLogin(response.credential).subscribe({
      next: (res) => {
        this.isGoogleLoading = false;
        this.cdr.detectChanges();

        if (res.email === 'admin@levelup.com') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },

      error: (err) => {
        this.isGoogleLoading = false;

        if (err.status === 404 && err.error?.needsRegistration) {
          // No existe cuenta con este correo: lo mandamos a completar su registro,
          // prellenando lo que ya sabemos gracias a Google.
          this.router.navigate(['/register'], {
            queryParams: {
              email: err.error?.email || '',
              nombre: err.error?.nombre || '',
            },
          });
          return;
        }

        this.errorMessage =
          err.error?.message ||
          'No fue posible iniciar sesión con Google. Intenta nuevamente.';

        this.cdr.detectChanges();
      }
    });
  }

  // ===== Recovery Modal Open/Close =====

  toggleForgotModal(show: boolean) {
    this.showForgotModal = show;

    if (show) {
      this.resetRecoveryState();
    }

    this.cdr.detectChanges();
  }

  closeRecoveryModal() {
    if (this.isRecoveryLoading) return;

    this.showForgotModal = false;
    this.clearAllTimers();
    this.resetRecoveryState();
    this.cdr.detectChanges();
  }

  private resetRecoveryState() {
    this.recoveryStep = 1;
    this.recoveryError = null;
    this.isRecoveryLoading = false;

    this.recoveryEmail = '';
    this.recoveryEmailInputError = null;

    this.maskedEmail = '';
    this.maskedPhone = null;
    this.hasPhone = false;
    this.selectedMedium = 'email';

    this.otpDigits = ['', '', '', '', '', ''];
    this.otpHasError = false;
    this.otpTimerSeconds = 300;
    this.otpTimerDisplay = '5:00';
    this.otpTimerExpired = false;
    this.canResendOtp = false;
    this.resendCooldownDisplay = '60';
    this.resendCooldownSeconds = 60;

    this.newPassword = '';
    this.confirmNewPassword = '';
    this.showNewPassword = false;
    this.showConfirmPassword = false;

    this.redirectCountdown = 3;

    this.clearAllTimers();
  }

  private clearAllTimers() {
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
      this.otpTimerInterval = null;
    }

    if (this.resendCooldownInterval) {
      clearInterval(this.resendCooldownInterval);
      this.resendCooldownInterval = null;
    }

    if (this.redirectInterval) {
      clearInterval(this.redirectInterval);
      this.redirectInterval = null;
    }
  }

  // ===== STEP 1: Check Email =====

  onCheckEmail() {
    this.recoveryEmailInputError = null;
    this.recoveryError = null;

    let email = this.recoveryEmail.trim();

    if (!email) {
      this.recoveryEmailInputError =
        'El correo electrónico es obligatorio.';
      this.cdr.detectChanges();
      return;
    }

    if (email.includes(' ')) {
      this.recoveryEmailInputError =
        'El correo no puede contener espacios.';
      this.cdr.detectChanges();
      return;
    }

    if (!email.includes('@')) {
      this.recoveryEmailInputError =
        'El correo debe contener @.';
      this.cdr.detectChanges();
      return;
    }

    const emailPattern =
      /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(com|co|es|net|org|edu|gov|io|me|info|cl|ar|mx|pe|ec|ve|com\.co|edu\.co|org\.co)$/i;

    if (!emailPattern.test(email)) {
      this.recoveryEmailInputError =
        'Formato de correo electrónico inválido.';
      this.cdr.detectChanges();
      return;
    }

    email = email.toLowerCase();
    this.recoveryEmail = email;
    this.isRecoveryLoading = true;
    this.selectedMedium = 'email';
    this.maskedEmail = this.maskEmail(email);
    this.cdr.detectChanges();

    this.authService.requestOtp(email, 'email').subscribe({
      next: () => {
        this.isRecoveryLoading = false;
        this.recoveryStep = 2;
        this.startOtpTimer();
        this.startResendCooldown();
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.isRecoveryLoading = false;

        this.recoveryError =
          err.error?.message ||
          'Hubo un error al enviar el código. Inténtalo más tarde.';

        this.cdr.detectChanges();
      }
    });
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');

    if (parts.length !== 2 || parts[0].length < 2) {
      return email;
    }

    const local = parts[0];

    const masked =
      local[0] +
      '*'.repeat(Math.max(local.length - 2, 1)) +
      local[local.length - 1];

    return `${masked}@${parts[1]}`;
  }

  // ===== Request OTP =====

  onRequestOtp() {
    this.recoveryError = null;
    this.isRecoveryLoading = true;
    this.cdr.detectChanges();

    this.authService.requestOtp(
      this.recoveryEmail,
      'email'
    ).subscribe({
      next: () => {
        this.isRecoveryLoading = false;
        this.recoveryStep = 2;
        this.startOtpTimer();
        this.startResendCooldown();
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.isRecoveryLoading = false;

        this.recoveryError =
          err.error?.message ||
          'Hubo un error al enviar el código. Inténtalo más tarde.';

        this.cdr.detectChanges();
      }
    });
  }

  // ===== OTP Input Handling =====

  trackByFn(index: number, item: any) {
    return index;
  }

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    if (this.otpDigits[index] === value) {
      return;
    }

    if (value.length > 1) {
      this.distributeOtp(value, index);
      return;
    }

    if (value.length === 1) {
      this.otpDigits[index] = value;
      this.otpHasError = false;

      if (index < 5) {
        setTimeout(() => {
          const inputs =
            document.querySelectorAll(
              '.otp-input'
            ) as NodeListOf<HTMLInputElement>;

          if (inputs[index + 1]) {
            inputs[index + 1].focus();
            inputs[index + 1].select();
          }
        }, 10);
      } else {
        input.blur();
      }

    } else {
      this.otpDigits[index] = '';
    }

    this.cdr.detectChanges();
  }

  private distributeOtp(
    value: string,
    startIndex: number = 0
  ) {
    const digits = value.split('');
    let currentIndex = startIndex;

    for (
      let i = 0;
      i < digits.length && currentIndex < 6;
      i++
    ) {
      this.otpDigits[currentIndex] = digits[i];
      currentIndex++;
    }

    this.otpHasError = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      const inputs =
        document.querySelectorAll(
          '.otp-input'
        ) as NodeListOf<HTMLInputElement>;

      const focusIndex =
        currentIndex < 6 ? currentIndex : 5;

      if (inputs[focusIndex]) {
        inputs[focusIndex].focus();
      }
    }, 10);
  }

  onOtpKeydown(
    event: KeyboardEvent,
    index: number
  ) {
    const inputs =
      document.querySelectorAll(
        '.otp-input'
      ) as NodeListOf<HTMLInputElement>;

    if (event.key === 'Backspace') {

      if (this.otpDigits[index] === '') {

        if (index > 0) {
          event.preventDefault();

          this.otpDigits[index - 1] = '';
          inputs[index - 1].focus();
          this.cdr.detectChanges();
        }
      }

    } else if (
      event.key === 'ArrowLeft' &&
      index > 0
    ) {

      event.preventDefault();
      inputs[index - 1].focus();
      inputs[index - 1].select();

    } else if (
      event.key === 'ArrowRight' &&
      index < 5
    ) {

      event.preventDefault();
      inputs[index + 1].focus();
      inputs[index + 1].select();
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();

    const pastedData =
      event.clipboardData
        ?.getData('text')
        ?.replace(/\D/g, '') || '';

    if (pastedData.length > 0) {
      this.distributeOtp(pastedData, 0);
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(
      d => d !== ''
    );
  }

  // ===== Verify OTP =====

  onVerifyOtp() {
    if (!this.isOtpComplete()) {
      return;
    }

    this.recoveryError = null;
    this.isRecoveryLoading = true;
    this.cdr.detectChanges();

    const code = this.otpDigits.join('');

    this.authService.verifyOtp(
      this.recoveryEmail,
      code
    ).subscribe({
      next: () => {
        this.isRecoveryLoading = false;
        this.recoveryStep = 3;
        this.clearAllTimers();
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.isRecoveryLoading = false;
        this.otpHasError = true;

        this.recoveryError =
          err.error?.message ||
          'El código de seguridad no es válido.';

        this.cdr.detectChanges();
      }
    });
  }

  // ===== Resend OTP =====

  onResendOtp() {
    if (!this.canResendOtp) {
      return;
    }

    this.recoveryError = null;
    this.otpDigits = ['', '', '', '', '', ''];
    this.otpHasError = false;
    this.isRecoveryLoading = true;
    this.cdr.detectChanges();

    this.authService.requestOtp(
      this.recoveryEmail,
      'email'
    ).subscribe({
      next: () => {
        this.isRecoveryLoading = false;
        this.otpTimerSeconds = 300;
        this.otpTimerExpired = false;

        this.startOtpTimer();
        this.startResendCooldown();
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.isRecoveryLoading = false;

        this.recoveryError =
          err.error?.message ||
          'Error al reenviar. Inténtalo más tarde.';

        this.startResendCooldown();
        this.cdr.detectChanges();
      }
    });
  }

  // ===== Timers =====

  private startOtpTimer() {
    if (this.otpTimerInterval) {
      clearInterval(this.otpTimerInterval);
    }

    this.otpTimerSeconds = 300;
    this.otpTimerExpired = false;
    this.updateOtpTimerDisplay();

    this.otpTimerInterval = setInterval(() => {
      this.otpTimerSeconds--;
      this.updateOtpTimerDisplay();

      if (this.otpTimerSeconds <= 0) {
        clearInterval(this.otpTimerInterval);

        this.otpTimerExpired = true;
        this.otpDigits = ['', '', '', '', '', ''];
        this.otpHasError = false;

        this.recoveryError =
          'El código de verificación ha expirado. Solicita uno nuevo para continuar.';
      }

      this.cdr.detectChanges();
    }, 1000);
  }

  private updateOtpTimerDisplay() {
    const min = Math.floor(
      this.otpTimerSeconds / 60
    );

    const sec =
      this.otpTimerSeconds % 60;

    this.otpTimerDisplay =
      `${min}:${sec.toString().padStart(2, '0')}`;
  }

  private startResendCooldown() {
    if (this.resendCooldownInterval) {
      clearInterval(
        this.resendCooldownInterval
      );
    }

    this.canResendOtp = false;
    this.resendCooldownSeconds = 60;
    this.resendCooldownDisplay = '60';

    this.resendCooldownInterval =
      setInterval(() => {
        this.resendCooldownSeconds--;

        this.resendCooldownDisplay =
          this.resendCooldownSeconds.toString();

        if (
          this.resendCooldownSeconds <= 0
        ) {
          clearInterval(
            this.resendCooldownInterval
          );

          this.canResendOtp = true;
        }

        this.cdr.detectChanges();
      }, 1000);
  }

  // ===== Password Strength =====

  hasUppercase(pw: string): boolean {
    return /[A-Z]/.test(pw);
  }

  hasLowercase(pw: string): boolean {
    return /[a-z]/.test(pw);
  }

  hasNumber(pw: string): boolean {
    return /\d/.test(pw);
  }

  hasSpecialChar(pw: string): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);
  }

  isPasswordValid(): boolean {
    return (
      this.newPassword.length >= 8 &&
      this.hasUppercase(this.newPassword) &&
      this.hasLowercase(this.newPassword) &&
      this.hasNumber(this.newPassword) &&
      this.hasSpecialChar(this.newPassword) &&
      this.newPassword === this.confirmNewPassword &&
      this.confirmNewPassword.length > 0
    );
  }

  // ===== Reset Password =====

  onResetNewPassword() {

    if (
      this.newPassword !==
      this.confirmNewPassword
    ) {
      this.recoveryError =
        'Las contraseñas no coinciden.';

      this.cdr.detectChanges();
      return;
    }

    if (!this.isPasswordValid()) {
      this.recoveryError =
        'Por favor verifica que la contraseña cumpla todos los requisitos.';

      this.cdr.detectChanges();
      return;
    }

    this.recoveryError = null;
    this.isRecoveryLoading = true;
    this.cdr.detectChanges();

    const code = this.otpDigits.join('');

    this.authService.resetPassword(
      this.recoveryEmail,
      code,
      this.newPassword
    ).subscribe({
      next: () => {
        this.isRecoveryLoading = false;
        this.recoveryStep = 4;
        this.startRedirectCountdown();
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.isRecoveryLoading = false;

        this.recoveryError =
          err.error?.message ||
          'No se pudo actualizar la contraseña. Inténtalo de nuevo.';

        this.cdr.detectChanges();
      }
    });
  }

  // ===== Redirect Countdown =====

  private startRedirectCountdown() {
    this.redirectCountdown = 3;

    this.redirectInterval =
      setInterval(() => {
        this.redirectCountdown--;

        if (
          this.redirectCountdown <= 0
        ) {
          clearInterval(
            this.redirectInterval
          );

          this.redirectInterval = null;
          this.showForgotModal = false;

          this.clearAllTimers();
          this.resetRecoveryState();
        }

        this.cdr.detectChanges();
      }, 1000);
  }

  // ===== Cleanup =====

  ngOnDestroy() {
    this.clearAllTimers();
  }
}