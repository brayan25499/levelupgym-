import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador personalizado para Nombre y Apellidos
 * - Permite letras, espacios internos y guiones
 * - No permite espacios al inicio o final
 */
export function nameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value.trim();
    
    // Verificar espacios al inicio o final
    if (control.value !== value) {
      return { 'spacesAtEnds': true };
    }
    
    // Permitir: letras (incluyendo acentos), espacios internos y guiones
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ][a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-]*[a-zA-ZáéíóúÁÉÍÓÚñÑ]$|^[a-zA-ZáéíóúÁÉÍÓÚñÑ]$/;
    
    if (!namePattern.test(value)) {
      return { 'invalidName': true };
    }
    
    return null;
  };
}

/**
 * Validador personalizado para Email
 * - Valida formato básico de email
 * - Requiere @
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value.trim();
    
    // Verificar espacios al inicio o final
    if (control.value !== value) {
      return { 'spacesAtEnds': true };
    }
    
    // Validar que contenga @
    if (!value.includes('@')) {
      return { 'missingAt': true };
    }
    
    // Patrón mejorado para email (más flexible que el anterior)
    const emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailPattern.test(value)) {
      return { 'invalidEmail': true };
    }
    
    return null;
  };
}

/**
 * Validador personalizado para Contraseña
 * - Al menos 8 caracteres
 * - Al menos un carácter especial (obligatorio)
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - NO permitir espacios
 */
export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value;
    
    // Verificar espacios
    if (value.includes(' ')) {
      return { 'spacesNotAllowed': true };
    }
    
    // Verificar longitud mínima
    if (value.length < 8) {
      return { 'minLength': true };
    }
    
    // Verificar mayúscula
    if (!/[A-Z]/.test(value)) {
      return { 'noUppercase': true };
    }
    
    // Verificar minúscula
    if (!/[a-z]/.test(value)) {
      return { 'noLowercase': true };
    }
    
    // Verificar número
    if (!/\d/.test(value)) {
      return { 'noNumber': true };
    }
    
    // Verificar carácter especial (OBLIGATORIO)
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
      return { 'noSpecialChar': true };
    }
    
    return null;
  };
}

/**
 * Validador personalizado para Teléfono
 * - No permite espacios al inicio o final
 * - Solo números
 * - Máximo 15 dígitos para números internacionales
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value.trim();
    
    // Verificar espacios al inicio o final
    if (control.value !== value) {
      return { 'spacesAtEnds': true };
    }
    
    // Verificar que solo contenga números
    if (!/^\d+$/.test(value)) {
      return { 'onlyNumbers': true };
    }
    
    // Verificar longitud máxima (15 dígitos para números internacionales)
    if (value.length > 15) {
      return { 'maxLength': true };
    }
    
    return null;
  };
}

/**
 * Validador personalizado para Peso y Altura
 * - Solo números
 * - Máximo 3 dígitos
 * - Puede incluir un punto decimal
 */
export function numericWithDecimalValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value && control.value !== 0) return null;
    
    const value = control.value.toString().trim();
    
    // Verificar que solo contenga números y un punto decimal
    if (!/^\d+(\.\d+)?$/.test(value)) {
      return { 'invalidNumeric': true };
    }
    
    // Verificar longitud máxima de 3 dígitos antes del punto
    const parts = value.split('.');
    if (parts[0].length > 3) {
      return { 'maxLength': true };
    }
    
    return null;
  };
}

/**
 * Validador para confirmar que las contraseñas coincidan
 */
export function passwordMatchValidator(passwordFieldName: string, confirmFieldName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordFieldName)?.value;
    const confirmPassword = group.get(confirmFieldName)?.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      return { 'passwordMismatch': true };
    }
    
    return null;
  };
}
