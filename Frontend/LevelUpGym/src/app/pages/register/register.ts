import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage: string | null = null;
  isLoading = false;

  registerForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/)]],
    apellidos: ['', [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
    confirmPassword: ['', [Validators.required]],
    tipoDocumento: ['CC', Validators.required],
    numDocumento: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[0-9]+$/)]],
    sexo: ['', Validators.required],
    telefono: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[0-9]+$/)]],
    peso: [null, [Validators.required, Validators.maxLength(3), Validators.pattern(/^[0-9]+$/)]],
    estatura: [null, [Validators.required, Validators.maxLength(3), Validators.pattern(/^[0-9]+$/)]],
    terminos: [false, Validators.requiredTrue]
  }, {
    validators: this.passwordMatchValidator
  });

  passwordMatchValidator(group: any) {
    const pass = group.get('password')?.value;
    const confirmPass = group.get('confirmPassword')?.value;
    return pass === confirmPass ? null : { passwordMismatch: true };
  }

  onSubmit() {
    this.errorMessage = null;
    if (this.registerForm.valid) {
      this.isLoading = true;
      const data = { ...this.registerForm.value };
      data.email = data.email?.toLowerCase().trim();
      data.nombre = data.nombre?.trim();
      data.apellidos = data.apellidos?.trim();
      data.numDocumento = data.numDocumento?.trim();

      this.authService.register(data).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (err.error === 'Email already exists.') {
            this.errorMessage = 'Correo ya registrado';
          } else {
            this.errorMessage = err.error || 'Error en el registro. Por favor verifica los datos.';
          }
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.registerForm.markAllAsTouched();
    }
  }
}
