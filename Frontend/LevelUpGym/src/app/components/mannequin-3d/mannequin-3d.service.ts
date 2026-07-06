import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MuscleInfo } from './interfaces/mannequin.interface';
import { DEFAULT_MUSCLES } from './models/muscle.model';

@Injectable({
  providedIn: 'root'
})
export class Mannequin3DService {
  getMuscles(): Observable<MuscleInfo[]> {
    return of(DEFAULT_MUSCLES);
  }

  getMuscleById(id: string): Observable<MuscleInfo | undefined> {
    const muscle = DEFAULT_MUSCLES.find(m => m.id === id || m.name.toLowerCase() === id.toLowerCase());
    return of(muscle);
  }
}
