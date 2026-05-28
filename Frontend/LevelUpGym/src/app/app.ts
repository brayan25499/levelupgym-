import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { FooterComponent } from './components/footer/footer';
import { CommonModule } from '@angular/common';
import { AlertService } from './services/alert.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('LevelUpGym');
  private router = inject(Router);
  public alertService = inject(AlertService);

  showLayout() {
    return !this.router.url.startsWith('/admin');
  }

  handleOk() {
    this.alertService.close();
  }

  handleYes() {
    const alert = this.alertService.currentAlert();
    if (alert && alert.onConfirm) {
      alert.onConfirm();
    }
    this.alertService.close();
  }

  handleNo() {
    this.alertService.close();
  }
}

