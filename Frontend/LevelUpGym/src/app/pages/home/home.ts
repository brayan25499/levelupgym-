import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EntrenadorService } from '../../services/entrenador.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  private entrenadorService = inject(EntrenadorService);
  trainerCount = signal<number>(0);

  ngOnInit(): void {
    this.entrenadorService.getEntrenadores().subscribe({
      next: (list) => {
        this.trainerCount.set(list ? list.length : 0);
      },
      error: (err) => {
        console.error('Error al consultar cantidad de entrenadores:', err);
      }
    });
  }
}
