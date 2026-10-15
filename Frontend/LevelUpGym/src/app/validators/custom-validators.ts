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
 * - Valida formato de email
 * - Requiere @
 * - Requiere una extensión de dominio válida (.com, .co, .es, .net, .org, .edu, .gov, .io, etc.)
 */
export function emailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value;
    
    // No permitir espacios en ninguna parte del correo
    if (value.includes(' ')) {
      return { 'noSpaces': true };
    }
    
    const trimmed = value.trim();
    
    // Validar que contenga @
    if (!trimmed.includes('@')) {
      return { 'missingAt': true };
    }
    
    // Validar formato completo de email con extensión válida
    const emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(com|co|es|net|org|edu|gov|io|me|info|cl|ar|mx|pe|ec|ve|com\.co|edu\.co|org\.co)$/i;
    
    if (!emailPattern.test(trimmed)) {
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
 * - Entre 7 y 10 dígitos (el indicativo del país se agrega por separado)
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value.toString().trim();
    
    // Verificar espacios al inicio o final
    if (control.value !== value) {
      return { 'spacesAtEnds': true };
    }
    
    // Verificar que solo contenga números
    if (!/^\d+$/.test(value)) {
      return { 'onlyNumbers': true };
    }
    
    // Verificar longitud (entre 7 y 10 dígitos)
    if (value.length < 7) {
      return { 'minLength': true };
    }
    
    if (value.length > 10) {
      return { 'maxLength': true };
    }
    
    return null;
  };
}

/**
 * Validador personalizado para Peso (KG)
 * - Rango entre 30 kg y 300 kg
 * - Permite hasta 1 decimal (ej: 75 o 75.5)
 */
export function weightValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') return null;
    
    const strVal = control.value.toString().trim();
    
    if (!/^\d+(\.\d{1})?$/.test(strVal)) {
      return { 'invalidFormat': true };
    }
    
    const val = parseFloat(strVal);
    if (isNaN(val) || val < 30 || val > 300) {
      return { 'outOfRange': true };
    }
    
    return null;
  };
}

/**
 * Validador personalizado para Estatura (CM)
 * - Rango entre 100 cm y 250 cm
 * - Solo enteros
 */
export function heightValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') return null;
    
    const strVal = control.value.toString().trim();
    
    if (!/^\d+$/.test(strVal)) {
      return { 'invalidFormat': true };
    }
    
    const val = parseInt(strVal, 10);
    if (isNaN(val) || val < 100 || val > 250) {
      return { 'outOfRange': true };
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

/**
 * Validador que no permite espacios en ningún lugar del campo
 */
export function noSpacesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    if (control.value.toString().includes(' ')) {
      return { 'noSpaces': true };
    }
    
    return null;
  };
}

/**
 * Validador de email para Login
 * - No permite espacios en ninguna posición
 * - Requiere @
 * - Soporta dominios válidos (.com, .co, .es, etc.)
 */
export function loginEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value;
    
    // Verificar espacios en cualquier posición (inicio, medio o final)
    if (value.includes(' ')) {
      return { 'noSpaces': true };
    }
    
    // Validar que contenga @
    if (!value.includes('@')) {
      return { 'missingAt': true };
    }
    
    // Validar formato completo de email con extensión válida
    const emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(com|co|es|net|org|edu|gov|io|me|info|cl|ar|mx|pe|ec|ve|com\.co|edu\.co|org\.co)$/i;
    
    if (!emailPattern.test(value)) {
      return { 'invalidEmail': true };
    }
    
    return null;
  };
}

/**
 * Validador de contraseña para Login
 * - No permite espacios en ninguna posición
 */
export function loginPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value;
    
    // Verificar espacios en cualquier posición (inicio, medio o final)
    if (value.includes(' ')) {
      return { 'spacesNotAllowed': true };
    }
    
    return null;
  };
}
