import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';

declare var google: any;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage: string | null = null;
  isLoading = false;

  registerForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/)]],
    apellidos: ['', [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
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

  ngOnInit() {
    this.registerForm.reset({
      nombre: '',
      apellidos: '',
      email: '',
      password: '',
      confirmPassword: '',
      tipoDocumento: 'CC',
      numDocumento: '',
      sexo: '',
      telefono: '',
      peso: null,
      estatura: null,
      terminos: false
    });

    this.initializeGoogleSignIn();

    // Real-time sanitization: Strip spaces and lowercase on email
    this.registerForm.get('email')?.valueChanges.subscribe(val => {
      if (val) {
        const cleaned = val.replace(/\s+/g, '').toLowerCase();
        if (val !== cleaned) {
          this.registerForm.get('email')?.setValue(cleaned, { emitEvent: false });
        }
      }
    });

    // Real-time sanitization: Trim spaces from password start/end
    this.registerForm.get('password')?.valueChanges.subscribe(val => {
      if (val) {
        const cleaned = val.trim();
        if (val !== cleaned) {
          this.registerForm.get('password')?.setValue(cleaned, { emitEvent: false });
        }
      }
    });

    this.registerForm.get('confirmPassword')?.valueChanges.subscribe(val => {
      if (val) {
        const cleaned = val.trim();
        if (val !== cleaned) {
          this.registerForm.get('confirmPassword')?.setValue(cleaned, { emitEvent: false });
        }
      }
    });
  }

  private initializeGoogleSignIn() {
    setTimeout(() => {
      if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
          client_id: '984365749210-placeholder.apps.googleusercontent.com', // Standard client ID placeholder
          callback: this.handleGoogleCredentialResponse.bind(this)
        });
        
        google.accounts.id.renderButton(
          document.getElementById('google-btn-register-container'),
          { theme: 'filled_black', size: 'large', width: '100%', text: 'signup_with' }
        );
      }
    }, 1000);
  }

  handleGoogleCredentialResponse(response: any) {
    if (response.credential) {
      this.isLoading = true;
      this.errorMessage = null;
      this.authService.loginWithGoogle(response.credential).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Error al registrar con Google.';
        }
      });
    }
  }

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
