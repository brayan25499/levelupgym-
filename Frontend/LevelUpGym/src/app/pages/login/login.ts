import { Component, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../services/alert.service';
import { loginEmailValidator, loginPasswordValidator } from '../../validators/custom-validators';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnDestroy {
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

  // ===== Recovery Modal State =====
  showForgotModal = false;
  recoveryStep = 1; // 1=Identify, 2=Medium, 3=OTP, 4=Password, 5=Success
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

  // Step 2
  otpDigits: string[] = ['', '', '', '', '', ''];
  otpHasError = false;
  otpTimerSeconds = 300; // 5 minutes
  otpTimerDisplay = '5:00';
  otpTimerExpired = false;
  canResendOtp = false;
  resendCooldownDisplay = '60';
  private otpTimerInterval: any = null;
  private resendCooldownInterval: any = null;
  private resendCooldownSeconds = 60;

  // Step 3
  newPassword = '';
  confirmNewPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;

  // Step 4
  redirectCountdown = 3;
  private redirectInterval: any = null;

  // ===== Login =====
  onSubmit() {
    this.errorMessage = null;
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.authService.login(this.loginForm.value).subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.email === 'admin@levelup.com') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.isLoading = false;
          const errorMsg = typeof err.error === 'string' ? err.error : (err.error?.message || '');
          if (errorMsg.includes('no encontrado') || errorMsg.includes('Usuario')) {
            this.errorMessage = 'Usuario no encontrado. Verifica tu correo electrónico.';
          } else if (errorMsg.includes('Contraseña') || errorMsg.includes('incorrecta') || errorMsg.includes('password')) {
            this.errorMessage = 'Contraseña incorrecta. Inténtalo de nuevo.';
          } else {
            this.errorMessage = errorMsg || 'Error al iniciar sesión. Verifica tus credenciales.';
          }
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  // ===== Recovery Modal Open/Close =====
  toggleForgotModal(show: boolean) {
    this.showForgotModal = show;
    if (show) {
      this.resetRecoveryState();
    }
  }

  closeRecoveryModal() {
    if (this.isRecoveryLoading) return; // Prevent closing while loading
    this.showForgotModal = false;
    this.clearAllTimers();
    this.resetRecoveryState();
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
    if (this.otpTimerInterval) { clearInterval(this.otpTimerInterval); this.otpTimerInterval = null; }
    if (this.resendCooldownInterval) { clearInterval(this.resendCooldownInterval); this.resendCooldownInterval = null; }
    if (this.redirectInterval) { clearInterval(this.redirectInterval); this.redirectInterval = null; }
  }

  // ===== STEP 1: Check Email =====
  onCheckEmail() {
    this.recoveryEmailInputError = null;
    this.recoveryError = null;
    
    // Strict Validation
    let email = this.recoveryEmail.trim();
    if (!email) {
      this.recoveryEmailInputError = 'El correo electrónico es obligatorio.';
      return;
    }
    if (email.includes(' ')) {
      this.recoveryEmailInputError = 'El correo no puede contener espacios.';
      return;
    }
    if (!email.includes('@')) {
      this.recoveryEmailInputError = 'El correo debe contener @.';
      return;
    }
    
    const emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      this.recoveryEmailInputError = 'Formato de correo electrónico inválido.';
      return;
    }

    email = email.toLowerCase();
    this.recoveryEmail = email; // update model with lowercase
    this.isRecoveryLoading = true;

    this.authService.checkEmail(email).subscribe({
      next: (res) => {
        this.isRecoveryLoading = false;
        this.maskedEmail = res.maskedEmail || '';
        this.maskedPhone = res.maskedPhone || null;
        this.hasPhone = res.hasPhone || false;
        
        // Auto-select email as default
        this.selectedMedium = 'email'; 
        this.recoveryStep = 2; // Move to Medium Selection
      },
      error: (err) => {
        this.isRecoveryLoading = false;
        this.recoveryError = err.error?.message || 'El correo electrónico ingresado no se encuentra registrado en el sistema.';
      }
    });
  }

  // ===== STEP 2: Request OTP (Select Medium) =====
  onRequestOtp() {
    this.recoveryError = null;
    this.isRecoveryLoading = true;

    this.authService.requestOtp(this.recoveryEmail, this.selectedMedium).subscribe({
      next: (res) => {
        this.isRecoveryLoading = false;
        this.recoveryStep = 3;
        this.startOtpTimer();
        this.startResendCooldown();
      },
      error: (err) => {
        this.isRecoveryLoading = false;
        this.recoveryError = err.error?.message || 'Hubo un error al enviar el código. Inténtalo más tarde.';
      }
    });
  }

  // ===== STEP 3: OTP Input Handling =====
  trackByFn(index: number, item: any) {
    return index;
  }

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // Solo dígitos

    // Prevenir ciclos de actualización duplicados
    if (this.otpDigits[index] === value) return;

    if (value.length > 1) {
      // Si entra más de un carácter (ej. autocompletado del teclado), distribuirlo
      this.distributeOtp(value, index);
      return;
    }

    if (value.length === 1) {
      this.otpDigits[index] = value;
      this.otpHasError = false;

      // Avanzar al siguiente input
      if (index < 5) {
        setTimeout(() => {
          const inputs = document.querySelectorAll('.otp-input') as NodeListOf<HTMLInputElement>;
          if (inputs[index + 1]) {
            inputs[index + 1].focus();
            inputs[index + 1].select();
          }
        }, 10); // Pequeño timeout para que Angular actualice la vista
      } else {
        // Si estamos en el último dígito y están todos llenos, verificar automáticamente (opcional)
        // o simplemente quitar el foco para indicar que terminó.
        input.blur();
      }
    } else {
      this.otpDigits[index] = '';
    }
  }

  private distributeOtp(value: string, startIndex: number = 0) {
    const digits = value.split('');
    let currentIndex = startIndex;
    
    for (let i = 0; i < digits.length && currentIndex < 6; i++) {
      this.otpDigits[currentIndex] = digits[i];
      currentIndex++;
    }
    this.otpHasError = false;

    // Enfocar el siguiente input disponible o el último
    setTimeout(() => {
      const inputs = document.querySelectorAll('.otp-input') as NodeListOf<HTMLInputElement>;
      const focusIndex = currentIndex < 6 ? currentIndex : 5;
      if (inputs[focusIndex]) {
        inputs[focusIndex].focus();
      }
    }, 10);
  }

  onOtpKeydown(event: KeyboardEvent, index: number) {
    const inputs = document.querySelectorAll('.otp-input') as NodeListOf<HTMLInputElement>;
    
    if (event.key === 'Backspace') {
      if (this.otpDigits[index] === '') {
        // Si está vacío, retroceder y borrar el anterior
        if (index > 0) {
          event.preventDefault(); // Evitar comportamiento default
          this.otpDigits[index - 1] = '';
          inputs[index - 1].focus();
        }
      }
      // Si tiene valor, dejamos que el evento default lo borre, onOtpInput lo atrapará.
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputs[index - 1].focus();
      inputs[index - 1].select();
    } else if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      inputs[index + 1].focus();
      inputs[index + 1].select();
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault(); // Evitar que el paste nativo duplique
    const pastedData = event.clipboardData?.getData('text')?.replace(/\D/g, '') || '';
    if (pastedData.length > 0) {
      this.distributeOtp(pastedData, 0);
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d !== '');
  }

  // ===== STEP 3: Verify OTP =====
  onVerifyOtp() {
    if (!this.isOtpComplete()) return;

    this.recoveryError = null;
    this.isRecoveryLoading = true;
    const code = this.otpDigits.join('');

    this.authService.verifyOtp(this.recoveryEmail, code).subscribe({
      next: () => {
        this.isRecoveryLoading = false;
        this.recoveryStep = 4;
        this.clearAllTimers();
      },
      error: (err) => {
        this.isRecoveryLoading = false;
        this.otpHasError = true;
        this.recoveryError = err.error?.message || 'Código inválido. Inténtalo de nuevo.';
      }
    });
  }

  // ===== STEP 3: Resend OTP =====
  onResendOtp() {
    if (!this.canResendOtp) return;

    this.recoveryError = null;
    this.otpDigits = ['', '', '', '', '', ''];
    this.otpHasError = false;
    this.isRecoveryLoading = true;

    this.authService.requestOtp(this.recoveryEmail, this.selectedMedium).subscribe({
      next: (res) => {
        this.isRecoveryLoading = false;
        this.otpTimerSeconds = 300;
        this.otpTimerExpired = false;
        this.startOtpTimer();
        this.startResendCooldown();
      },
      error: (err) => {
        this.isRecoveryLoading = false;
        this.recoveryError = err.error?.message || 'Error al reenviar. Inténtalo más tarde.';
        this.startResendCooldown();
      }
    });
  }

  // ===== STEP 2: Timers =====
  private startOtpTimer() {
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);

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
        this.recoveryError = 'El código de verificación ha expirado. Solicita uno nuevo para continuar.';
      }
      this.cdr.detectChanges(); // Forzar actualización de la UI
    }, 1000);
  }

  private updateOtpTimerDisplay() {
    const min = Math.floor(this.otpTimerSeconds / 60);
    const sec = this.otpTimerSeconds % 60;
    this.otpTimerDisplay = `${min}:${sec.toString().padStart(2, '0')}`;
  }

  private startResendCooldown() {
    if (this.resendCooldownInterval) clearInterval(this.resendCooldownInterval);

    this.canResendOtp = false;
    this.resendCooldownSeconds = 60;
    this.resendCooldownDisplay = '60';

    this.resendCooldownInterval = setInterval(() => {
      this.resendCooldownSeconds--;
      this.resendCooldownDisplay = this.resendCooldownSeconds.toString();

      if (this.resendCooldownSeconds <= 0) {
        clearInterval(this.resendCooldownInterval);
        this.canResendOtp = true;
      }
      this.cdr.detectChanges(); // Forzar actualización de la UI
    }, 1000);
  }

  // ===== STEP 3: Password Strength Helpers =====
  hasUppercase(pw: string): boolean { return /[A-Z]/.test(pw); }
  hasLowercase(pw: string): boolean { return /[a-z]/.test(pw); }
  hasNumber(pw: string): boolean { return /\d/.test(pw); }
  hasSpecialChar(pw: string): boolean { return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw); }

  isPasswordValid(): boolean {
    return this.newPassword.length >= 8
      && this.hasUppercase(this.newPassword)
      && this.hasLowercase(this.newPassword)
      && this.hasNumber(this.newPassword)
      && this.hasSpecialChar(this.newPassword)
      && this.newPassword === this.confirmNewPassword
      && this.confirmNewPassword.length > 0;
  }

  // ===== STEP 4: Reset Password =====
  onResetNewPassword() {
    if (!this.isPasswordValid()) return;

    this.recoveryError = null;
    this.isRecoveryLoading = true;
    const code = this.otpDigits.join('');

    this.authService.resetPassword(this.recoveryEmail, code, this.newPassword).subscribe({
      next: () => {
        this.isRecoveryLoading = false;
        this.recoveryStep = 5;
        this.startRedirectCountdown();
      },
      error: (err) => {
        this.isRecoveryLoading = false;
        this.recoveryError = err.error?.message || 'No se pudo actualizar la contraseña. Inténtalo de nuevo.';
      }
    });
  }

  // ===== STEP 5: Redirect Countdown =====
  private startRedirectCountdown() {
    this.redirectCountdown = 3;

    this.redirectInterval = setInterval(() => {
      this.redirectCountdown--;
      if (this.redirectCountdown <= 0) {
        clearInterval(this.redirectInterval);
        this.closeRecoveryModal();
      }
    }, 1000);
  }

  // ===== Cleanup =====
  ngOnDestroy() {
    this.clearAllTimers();
  }
}
