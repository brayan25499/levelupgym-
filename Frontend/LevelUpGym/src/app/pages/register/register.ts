import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import {
  nameValidator,
  emailValidator,
  passwordValidator,
  phoneValidator,
  numericWithDecimalValidator,
  passwordMatchValidator
} from '../../validators/custom-validators';
import { TermsModalComponent } from '../../components/terms-modal/terms-modal.component';

interface CountryCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TermsModalComponent],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild(TermsModalComponent) termsModal!: TermsModalComponent;

  errorMessage: string | null = null;
  isLoading = false;

  // Países más comunes con sus códigos de teléfono
  countryCodes: CountryCode[] = [
    { name: 'Colombia', code: 'CO', dialCode: '+57', flag: '🇨🇴' },
    { name: 'Argentina', code: 'AR', dialCode: '+54', flag: '🇦🇷' },
    { name: 'Brasil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
    { name: 'Chile', code: 'CL', dialCode: '+56', flag: '🇨🇱' },
    { name: 'Ecuador', code: 'EC', dialCode: '+593', flag: '🇪🇨' },
    { name: 'Perú', code: 'PE', dialCode: '+51', flag: '🇵🇪' },
    { name: 'Venezuela', code: 'VE', dialCode: '+58', flag: '🇻🇪' },
    { name: 'México', code: 'MX', dialCode: '+52', flag: '🇲🇽' },
    { name: 'España', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
    { name: 'Estados Unidos', code: 'US', dialCode: '+1', flag: '🇺🇸' },
    { name: 'Canadá', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  ];

  registerForm = this.fb.group({
    nombre: ['', [Validators.required, nameValidator()]],
    apellidos: ['', [Validators.required, nameValidator()]],
    email: ['', [Validators.required, emailValidator()]],
    password: ['', [Validators.required, passwordValidator()]],
    confirmPassword: ['', [Validators.required]],
    tipoDocumento: ['CC', Validators.required],
    numDocumento: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[0-9]+$/)]],
    sexo: ['', Validators.required],
    countryCode: ['+57', Validators.required],
    telefono: ['', [Validators.required, phoneValidator()]],
    peso: [null, [Validators.required, numericWithDecimalValidator()]],
    estatura: [null, [Validators.required, numericWithDecimalValidator()]],
    terminos: [false, Validators.requiredTrue]
  }, {
    validators: passwordMatchValidator('password', 'confirmPassword')
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
      countryCode: '+57',
      telefono: '',
      peso: null,
      estatura: null,
      terminos: false
    });
  }

  openTermsModal(): void {
    this.termsModal.open();
  }

  onTermsAccepted(): void {
    this.registerForm.get('terminos')?.setValue(true);
  }

  onTermsRejected(): void {
    this.registerForm.get('terminos')?.setValue(false);
  }

  onSubmit() {
    this.errorMessage = null;
    if (this.registerForm.valid) {
      this.isLoading = true;
      const formValue = { ...this.registerForm.value };
      
      // Trimear campos de texto y convertir a minúsculas donde sea apropiado
      formValue.email = formValue.email?.toLowerCase().trim();
      formValue.nombre = formValue.nombre?.trim();
      formValue.apellidos = formValue.apellidos?.trim();
      formValue.numDocumento = formValue.numDocumento?.trim();
      formValue.telefono = formValue.telefono?.trim();
      
      // Combinar código de país con número telefónico
      const countryCode = formValue.countryCode || '+57';
      const phoneNumber = formValue.telefono;
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;

      const data = {
        nombre: formValue.nombre,
        apellidos: formValue.apellidos,
        email: formValue.email,
        password: formValue.password,
        tipoDocumento: formValue.tipoDocumento,
        numDocumento: formValue.numDocumento,
        sexo: formValue.sexo,
        telefono: fullPhoneNumber,
        peso: formValue.peso,
        estatura: formValue.estatura
      };

      this.authService.register(data).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (err.error === 'Email already exists.' || err.error.includes('Email')) {
            this.errorMessage = 'Correo ya registrado';
          } else if (err.error.includes('documento')) {
            this.errorMessage = 'Número de documento ya registrado';
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
