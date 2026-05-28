import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  isLoading = false;

  // Forgot Password state
  showForgotModal = false;
  forgotEmail = '';
  forgotDoc = '';
  forgotNewPassword = '';
  isResetting = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/)]],
    password: ['', [Validators.required]],
  });

  onSubmit() {
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
          this.alertService.error(err.error || 'Verifica tus credenciales e intenta de nuevo.', 'Error de Autenticación');
        }
      });
    }
  }

  toggleForgotModal(show: boolean) {
    this.showForgotModal = show;
    if (!show) {
      this.forgotEmail = '';
      this.forgotDoc = '';
      this.forgotNewPassword = '';
    }
  }

  onResetPassword() {
    if (!this.forgotEmail || !this.forgotDoc || !this.forgotNewPassword) {
      this.alertService.error('Por favor completa todos los campos.');
      return;
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/.test(this.forgotEmail)) {
      this.alertService.error('El email debe contener "@" y terminar en ".com"');
      return;
    }

    if (this.forgotNewPassword.length < 8) {
      this.alertService.error('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    this.isResetting = true;
    const payload = {
      email: this.forgotEmail.toLowerCase().trim(),
      numDocumento: this.forgotDoc.trim(),
      newPassword: this.forgotNewPassword
    };

    this.authService.forgotPassword(payload).subscribe({
      next: (res) => {
        this.isResetting = false;
        this.alertService.success(res.message || 'Contraseña restablecida correctamente.');
        this.toggleForgotModal(false);
      },
      error: (err) => {
        this.isResetting = false;
        this.alertService.error(err.error || 'No se pudo restablecer la contraseña. Verifica los datos.');
      }
    });
  }
}

