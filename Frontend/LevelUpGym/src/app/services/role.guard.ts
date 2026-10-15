import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

const ADMIN_EMAIL = 'admin@levelup.com';
const TRAINER_EMAIL = 'entrenador@levelup.com';

export const roleGuard = (emailPermitido: string): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const email = authService.currentUser()?.email;

    // Sin sesión: al login
    if (!email) {
      router.navigate(['/login']);
      return false;
    }

    // Es quien debe estar aquí: pasa
    if (email === emailPermitido) {
      return true;
    }

    // Tiene sesión pero no le corresponde: lo mandamos a su propio panel
    if (email === ADMIN_EMAIL) {
      router.navigate(['/admin']);
    } else if (email === TRAINER_EMAIL) {
      router.navigate(['/trainer']);
    } else {
      router.navigate(['/dashboard']);
    }
    return false;
  };
};

// Solo deja pasar a clientes. Admin y entrenador van a su propio panel.
export const clientGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const email = authService.currentUser()?.email;

  if (!email) {
    router.navigate(['/login']);
    return false;
  }

  if (email === ADMIN_EMAIL) {
    router.navigate(['/admin']);
    return false;
  }

  if (email === TRAINER_EMAIL) {
    router.navigate(['/trainer']);
    return false;
  }

  return true;
};