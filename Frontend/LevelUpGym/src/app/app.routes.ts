import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { AboutComponent } from './pages/about/about';
import { PlansComponent } from './pages/plans/plans';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { PrivacyComponent } from './pages/privacy/privacy';
import { TermsComponent } from './pages/terms/terms';
import { CookiesComponent } from './pages/cookies/cookies';
import { authGuard } from './services/auth.guard';
   import { roleGuard, clientGuard } from './services/role.guard';

import { TrainerDashboardComponent } from './pages/trainer-dashboard/trainer-dashboard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'plans', component: PlansComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard, clientGuard] },
  { path: 'profile', component: DashboardComponent, canActivate: [authGuard, clientGuard] },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [authGuard, roleGuard('admin@levelup.com')]
  },
  {
    path: 'trainer',
    component: TrainerDashboardComponent,
    canActivate: [authGuard, roleGuard('entrenador@levelup.com')]
  },
  { path: 'privacidad', component: PrivacyComponent },
  { path: 'terminos', component: TermsComponent },
  { path: 'cookies', component: CookiesComponent },
  { path: '**', redirectTo: '' }
];