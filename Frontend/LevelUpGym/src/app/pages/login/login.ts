import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../services/alert.service';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = false;
  showPassword = false;

  // Forgot Password flow
  showForgotModal = false;
  forgotEmail = '';
  isSendingEmail = false;

  // Reset Password flow (via token link)
  recoveryToken = '';
  showResetModal = false;
  resetNewPassword = '';
  resetConfirmPassword = '';
  isResetting = false;

  loginForm = this.fb.group({
    email: ['', [
      Validators.required, 
      Validators.email, 
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/)
    ]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(64)
    ]],
    rememberMe: [false]
  });

  ngOnInit() {
    this.initializeGoogleSignIn();

    // Check for recovery token in query params
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.recoveryToken = params['token'];
        this.showResetModal = true;
      }
      if (params['sessionExpired'] === 'true') {
        this.router.navigate([], { queryParams: { sessionExpired: null }, queryParamsHandling: 'merge' });
        this.alertService.info('Tu sesión ha expirado por motivos de seguridad debido a un periodo de inactividad. Por favor, inicia sesión nuevamente.', 'Sesión Expirada');
      }
    });

    // Real-time sanitization: Strip spaces and lowercase on email
    this.loginForm.get('email')?.valueChanges.subscribe(val => {
      if (val) {
        const cleaned = val.replace(/\s+/g, '').toLowerCase();
        if (val !== cleaned) {
          this.loginForm.get('email')?.setValue(cleaned, { emitEvent: false });
        }
      }
    });

    // Real-time sanitization: Trim spaces from password start/end
    this.loginForm.get('password')?.valueChanges.subscribe(val => {
      if (val) {
        const cleaned = val.trim();
        if (val !== cleaned) {
          this.loginForm.get('password')?.setValue(cleaned, { emitEvent: false });
        }
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private initializeGoogleSignIn() {
    setTimeout(() => {
      if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
          client_id: '984365749210-placeholder.apps.googleusercontent.com',
          callback: this.handleGoogleCredentialResponse.bind(this)
        });
        
        google.accounts.id.renderButton(
          document.getElementById('google-btn-container'),
          { theme: 'filled_black', size: 'large', width: '100%', text: 'signin_with' }
        );
      }
    }, 1000);
  }

  handleGoogleCredentialResponse(response: any) {
    if (response.credential) {
      this.isLoading = true;
      this.authService.loginWithGoogle(response.credential).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.alertService.success('Sesión iniciada con Google');
          if (res.email === 'admin@levelup.com') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.alertService.error(err.error?.message || 'Error al autenticar con Google.', 'Google Auth');
        }
      });
    }
  }

  onSubmit() {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      const credentials = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };
      const remember = !!this.loginForm.value.rememberMe;

      this.authService.login(credentials, remember).subscribe({
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
          this.alertService.error(err.error?.message || err.error || 'Correo o contraseña incorrectos.', 'Error de Autenticación');
        }
      });
    }
  }

  toggleForgotModal(show: boolean) {
    this.showForgotModal = show;
    if (!show) {
      this.forgotEmail = '';
    }
  }

  // Request Reset Link via Email
  onRequestResetLink() {
    if (!this.forgotEmail) {
      this.alertService.error('El correo electrónico es requerido.');
      return;
    }

    const emailClean = this.forgotEmail.replace(/\s+/g, '').toLowerCase().trim();
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/.test(emailClean)) {
      this.alertService.error('El email debe contener "@" y terminar en ".com" sin espacios.');
      return;
    }

    this.isSendingEmail = true;
    this.authService.requestResetPassword(emailClean).subscribe({
      next: (res) => {
        this.isSendingEmail = false;
        this.alertService.success(res.message || 'Se ha enviado un enlace seguro a tu correo electrónico.');
        this.toggleForgotModal(false);
      },
      error: (err) => {
        this.isSendingEmail = false;
        this.alertService.error(err.error?.message || 'Error al solicitar el enlace. Intenta de nuevo.');
      }
    });
  }

  // Reset password using the token
  onResetPasswordWithToken() {
    if (!this.resetNewPassword || !this.resetConfirmPassword) {
      this.alertService.error('Por favor completa todos los campos.');
      return;
    }

    const passClean = this.resetNewPassword.trim();
    const confirmClean = this.resetConfirmPassword.trim();

    if (passClean.length < 8 || passClean.length > 64) {
      this.alertService.error('La contraseña debe tener entre 8 y 64 caracteres.');
      return;
    }

    if (passClean !== confirmClean) {
      this.alertService.error('Las contraseñas no coinciden.');
      return;
    }

    this.isResetting = true;
    this.authService.resetPassword(this.recoveryToken, passClean).subscribe({
      next: (res) => {
        this.isResetting = false;
        this.alertService.success(res.message || 'Contraseña actualizada. Ya puedes iniciar sesión.');
        this.showResetModal = false;
        this.recoveryToken = '';
        this.router.navigate([], { queryParams: { token: null }, queryParamsHandling: 'merge' });
      },
      error: (err) => {
        this.isResetting = false;
        this.alertService.error(err.error?.message || 'Token inválido o expirado. Solicita otro enlace.');
      }
    });
  }
}
