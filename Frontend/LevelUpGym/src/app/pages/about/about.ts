import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContactService, ContactMessage } from '../../services/contact';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-about',
  imports: [FormsModule, CommonModule],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class AboutComponent {
  private contactService = inject(ContactService);
  private alertService = inject(AlertService);

  contactForm: ContactMessage = {
    nombre: '',
    correo: '',
    asunto: '',
    mensaje: ''
  };

  enviando = false;
  submitted = false;

  // Field-level error messages
  errors: { nombre: string; correo: string; asunto: string; mensaje: string } = {
    nombre: '',
    correo: '',
    asunto: '',
    mensaje: ''
  };

  // --- Nombre validation ---
  validateNombre(): boolean {
    const value = this.contactForm.nombre;

    if (!value || value.trim().length === 0) {
      this.errors.nombre = 'El nombre es obligatorio.';
      return false;
    }
    if (value !== value.trim()) {
      this.errors.nombre = 'No se permiten espacios al inicio o al final del nombre.';
      return false;
    }
    if (/\s{2,}/.test(value)) {
      this.errors.nombre = 'No se permiten múltiples espacios consecutivos.';
      return false;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value)) {
      this.errors.nombre = 'Solo se permiten letras, espacios, tildes y la letra ñ.';
      return false;
    }

    this.errors.nombre = '';
    return true;
  }

  // --- Correo validation ---
  validateCorreo(): boolean {
    const value = this.contactForm.correo;

    if (!value || value.trim().length === 0) {
      this.errors.correo = 'El correo electrónico es obligatorio.';
      return false;
    }
    if (value !== value.trim()) {
      this.errors.correo = 'No se permiten espacios al inicio ni al final del correo electrónico.';
      return false;
    }
    if (/\s/.test(value)) {
      this.errors.correo = 'No se permiten espacios en el correo electrónico.';
      return false;
    }
    if (!value.includes('@')) {
      this.errors.correo = 'El correo debe contener el símbolo \'@\'.';
      return false;
    }
    // Check for a valid domain extension after the @
    const domainPart = value.split('@')[1] || '';
    if (!/\.[a-zA-Z]{2,}$/.test(domainPart)) {
      this.errors.correo = 'El correo debe contener un dominio válido (por ejemplo: .com, .net, .org).';
      return false;
    }
    // Full email format check
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value)) {
      this.errors.correo = 'El formato del correo electrónico no es válido.';
      return false;
    }

    this.errors.correo = '';
    return true;
  }

  // --- Asunto validation ---
  validateAsunto(): boolean {
    if (!this.contactForm.asunto) {
      this.errors.asunto = 'Selecciona un asunto.';
      return false;
    }
    this.errors.asunto = '';
    return true;
  }

  // --- Mensaje validation ---
  validateMensaje(): boolean {
    const value = this.contactForm.mensaje;

    if (!value || value.trim().length === 0) {
      this.errors.mensaje = 'El mensaje es obligatorio.';
      return false;
    }
    // Block HTML tags and script injections
    if (/<[^>]*>/i.test(value)) {
      this.errors.mensaje = 'El mensaje no puede contener etiquetas HTML o scripts por seguridad.';
      return false;
    }
    // Block javascript: protocol and event handlers
    if (/javascript\s*:/i.test(value) || /on\w+\s*=/i.test(value)) {
      this.errors.mensaje = 'El mensaje contiene contenido potencialmente peligroso.';
      return false;
    }

    this.errors.mensaje = '';
    return true;
  }

  // Sanitize message: strip any remaining HTML-like content before sending
  private sanitizeMensaje(value: string): string {
    return value
      .replace(/<[^>]*>/g, '')       // Remove HTML tags
      .replace(/javascript\s*:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '')     // Remove event handlers
      .trim();
  }

  onFieldBlur(field: 'nombre' | 'correo' | 'asunto' | 'mensaje') {
    switch (field) {
      case 'nombre': this.validateNombre(); break;
      case 'correo': this.validateCorreo(); break;
      case 'asunto': this.validateAsunto(); break;
      case 'mensaje': this.validateMensaje(); break;
    }
  }

  get hasErrors(): boolean {
    return !!(this.errors.nombre || this.errors.correo || this.errors.asunto || this.errors.mensaje);
  }

  onSubmit() {
    this.submitted = true;

    const isNombreValid = this.validateNombre();
    const isCorreoValid = this.validateCorreo();
    const isAsuntoValid = this.validateAsunto();
    const isMensajeValid = this.validateMensaje();

    if (!isNombreValid || !isCorreoValid || !isAsuntoValid || !isMensajeValid) {
      return;
    }

    this.enviando = true;

    // Sanitize before sending
    const payload: ContactMessage = {
      nombre: this.contactForm.nombre.trim(),
      correo: this.contactForm.correo.trim(),
      asunto: this.contactForm.asunto.trim(),
      mensaje: this.sanitizeMensaje(this.contactForm.mensaje)
    };

    this.contactService.enviarMensaje(payload).subscribe({
      next: (res) => {
        this.alertService.success(res.message || 'Tu mensaje ha sido enviado exitosamente.');
        this.contactForm = { nombre: '', correo: '', asunto: '', mensaje: '' };
        this.errors = { nombre: '', correo: '', asunto: '', mensaje: '' };
        this.submitted = false;
        this.enviando = false;
      },
      error: (err) => {
        const serverErrors = err.error?.errors;
        if (serverErrors && typeof serverErrors === 'object' && !Array.isArray(serverErrors)) {
          // Map field-level errors from backend
          this.errors.nombre = serverErrors.nombre || '';
          this.errors.correo = serverErrors.correo || '';
          this.errors.asunto = serverErrors.asunto || '';
          this.errors.mensaje = serverErrors.mensaje || '';
        } else {
          const msg = Array.isArray(serverErrors) ? serverErrors.join(', ') : (err.error?.message || 'Error al enviar el mensaje. Intenta nuevamente.');
          this.alertService.error(msg);
        }
        this.enviando = false;
      }
    });
  }
}
