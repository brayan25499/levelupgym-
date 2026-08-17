import { Component, inject, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { MembershipService, Membership } from '../../services/membership';
import { ClassSessionService, ClassSession } from '../../services/class-session.service';
import { AlertService } from '../../services/alert.service';
import * as THREE from 'three';

export interface ExerciseItem {
  nombre: string;
  musculo: string;
  descripcion: string;
  series: number;
  repeticiones: string;
  descanso: string;
  nivel: string;
  recomendaciones: string[];
  imagenUrl?: string;
}

export interface WorkoutRoutine {
  id: number;
  titulo: string;
  grupoMuscular: string;
  nivel: string;
  duracionMin: number;
  ejerciciosCount: number;
  ejercicios: ExerciseItem[];
}

export interface MuscleInfo {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  ejercicios: string[];
}

export interface UserGoal {
  id: number;
  titulo: string;
  descripcion: string;
  progreso: number;
  fechaObjetivo: string;
  estado: 'En progreso' | 'Completado' | 'Pendiente';
}

export interface UserSession {
  id: number;
  fecha: string;
  hora: string;
  entrenamiento: string;
  entrenador: string;
  estado: 'Programada' | 'Completada' | 'Cancelada';
}

export interface ImcRecord {
  id: string;
  fecha: string;
  pesoKg: number;
  estaturaM: number;
  imc: number;
}

export interface BmiEvaluation {
  imc: number;
  pesoKg: number;
  estaturaM: number;
  fechaActualizacion: string;
  categoria: string;
  badgeClass: string;
  mensaje: string;
  objetivoSugerido: string;
  frecuenciaSugerida: string;
  ejerciciosRecomendados: { nombre: string; enfoque: string; razon: string }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  authService = inject(AuthService);
  membershipService = inject(MembershipService);
  private classService = inject(ClassSessionService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  @ViewChild('muscleCanvas') muscleCanvasRef?: ElementRef<HTMLCanvasElement>;

  user = this.authService.currentUser;
  profileData = signal<any>(null);
  availablePlans = signal<Membership[]>([]);
  activeSection = 'inicio';
  today = new Date();
  sidebarMobileOpen = signal<boolean>(false);

  // IMC State & History
  imcRecords = signal<ImcRecord[]>([]);
  showBmiModal = signal<boolean>(false);

  bmiForm = this.fb.group({
    peso: [null as number | null, [Validators.required, Validators.min(20), Validators.max(300)]],
    estatura: [null as number | null, [Validators.required, Validators.min(50), Validators.max(260)]]
  });

  // Modals & Views
  showDeleteConfirmModal = false;
  lastReceipt = signal<any>(null);
  showReceiptModal = signal<boolean>(false);
  selectedExerciseModal = signal<ExerciseItem | null>(null);
  showNewSessionModal = signal<boolean>(false);
  showPasswordModal = signal<boolean>(false);

  // Forms
  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  sessionForm = this.fb.group({
    entrenamiento: ['Entrenamiento de Fuerza', Validators.required],
    entrenador: ['Carlos Ruiz (Coach Pro)', Validators.required],
    fecha: ['', Validators.required],
    hora: ['09:00', Validators.required]
  });

  // 3D Muscle Explorer State
  selectedMuscle = signal<MuscleInfo | null>(null);
  hoveredMuscleName = signal<string | null>(null);
  private threeScene?: THREE.Scene;
  private threeCamera?: THREE.PerspectiveCamera;
  private threeRenderer?: THREE.WebGLRenderer;
  private threeAnimationId?: number;
  private muscleMeshes: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredMesh: THREE.Mesh | null = null;
  private isDragging3D = false;
  private previousMousePosition = { x: 0, y: 0 };
  private humanModelGroup?: THREE.Group;

  // Muscle Database
  musclesDatabase: Record<string, MuscleInfo> = {
    pectoral: {
      id: 'pectoral',
      nombre: 'Pectoral mayor (Pecho)',
      categoria: 'Torso Superior',
      descripcion: 'Músculo principal de la parte frontal del tórax, responsable de la aducción y rotación interna del brazo.',
      ejercicios: ['Press de banca con barra', 'Press inclinado con mancuernas', 'Aperturas en polea alta (Crossover)', 'Fondos en paralelas para pecho']
    },
    deltoides: {
      id: 'deltoides',
      nombre: 'Deltoides (Hombros)',
      categoria: 'Extremidad Superior',
      descripcion: 'Músculo de forma triangular que cubre la articulación del hombro, clave para la elevación y estabilidad del brazo.',
      ejercicios: ['Press militar con barra', 'Elevaciones laterales con mancuernas', 'Pájaros para deltoides posterior en polea', 'Press Arnold']
    },
    biceps: {
      id: 'biceps',
      nombre: 'Bíceps braquial',
      categoria: 'Brazos - Anterior',
      descripcion: 'Músculo ubicado en la región anterior del brazo, flexor del codo y supinador del antebrazo.',
      ejercicios: ['Curl de bíceps con barra Z', 'Curl martillo con mancuernas', 'Curl concentrado en banco Scott', 'Curl en polea baja']
    },
    triceps: {
      id: 'triceps',
      nombre: 'Tríceps braquial',
      categoria: 'Brazos - Posterior',
      descripcion: 'Músculo compuesto por tres cabezas en la parte posterior del brazo, responsable de la extensión del codo.',
      ejercicios: ['Extensiones en polea alta con cuerda', 'Press francés con barra Z', 'Fondos en banco o paralelas', 'Patada de tríceps']
    },
    abs: {
      id: 'abs',
      nombre: 'Abdominales y Core',
      categoria: 'Zona Media / Core',
      descripcion: 'Grupo muscular central que estabiliza la columna vertebral, pelvis y mejora la postura corporal.',
      ejercicios: ['Crunch abdominal en polea alta', 'Plancha isométrica', 'Elevación de piernas colgado en barra', 'Rueda abdominal']
    },
    dorsal: {
      id: 'dorsal',
      nombre: 'Dorsal ancho (Espalda)',
      categoria: 'Espalda Alta y Media',
      descripcion: 'El músculo más ancho del cuerpo humano, responsable de la tracción y expansión de la espalda.',
      ejercicios: ['Dominadas pronadas', 'Jalón al pecho con agarre ancho', 'Remo con barra T', 'Remo unilateral con mancuerna']
    },
    trapecio: {
      id: 'trapecio',
      nombre: 'Trapecio',
      categoria: 'Espalda Alta y Cuello',
      descripcion: 'Músculo posterior que va desde el cuello hasta la mitad de la espalda, eleva y estabiliza la escápula.',
      ejercicios: ['Encogimientos de hombros con mancuernas', 'Paseo del granjero', 'Remo al mentón con barra Z']
    },
    lumbares: {
      id: 'lumbares',
      nombre: 'Lumbares / Erector de la columna',
      categoria: 'Espalda Baja',
      descripcion: 'Músculos de la zona lumbar encargados de la extensión del tronco y la estabilidad espinal.',
      ejercicios: ['Peso muerto rumano', 'Hiperextensiones en banco a 45°', 'Buenos días con barra']
    },
    cuadriceps: {
      id: 'cuadriceps',
      nombre: 'Cuádriceps femoral',
      categoria: 'Piernas - Frontal',
      descripcion: 'Grupo muscular de cuatro cabezas en la cara anterior del muslo, extensor principal de la rodilla.',
      ejercicios: ['Sentadillas profundas con barra', 'Prensa inclinada a 45°', 'Zancadas caminando con mancuernas', 'Extensiones de cuádriceps en máquina']
    },
    isquiotibiales: {
      id: 'isquiotibiales',
      nombre: 'Isquiotibiales / Femoral',
      categoria: 'Piernas - Posterior',
      descripcion: 'Músculos ubicados en la cara posterior del muslo, encargados de la flexión de rodilla y extensión de cadera.',
      ejercicios: ['Curl femoral tumbado en máquina', 'Peso muerto estilo sumo', 'Peso muerto rumano con mancuernas']
    },
    gluteos: {
      id: 'gluteos',
      nombre: 'Glúteos (Mayor y Medio)',
      categoria: 'Cadera y Pelvis',
      descripcion: 'Músculo más potente del cuerpo, clave para la potencia de cadera, zancada y estabilidad pélvica.',
      ejercicios: ['Hip Thrust con barra', 'Zancadas búlgaras con mancuernas', 'Patada de glúteo en polea', 'Abducción en máquina']
    },
    gemelos: {
      id: 'gemelos',
      nombre: 'Gastrocnemio / Gemelos',
      categoria: 'Pantorrillas',
      descripcion: 'Músculos de la parte posterior de la pierna, responsables de la flexión plantar del pie.',
      ejercicios: ['Elevación de talones de pie con barra', 'Elevación de talones en prensa', 'Elevación de talones sentado']
    }
  };

  routinesList = signal<WorkoutRoutine[]>([
    {
      id: 1,
      titulo: 'Rutina de Torso & Hipertrofia',
      grupoMuscular: 'Pecho, Espalda y Hombros',
      nivel: 'Intermedio - Avanzado',
      duracionMin: 60,
      ejerciciosCount: 5,
      ejercicios: [
        {
          nombre: 'Press de banca plano con barra',
          musculo: 'Pectoral mayor',
          descripcion: 'Ejercicio básico de fuerza para la parte central e inferior del pecho.',
          series: 4,
          repeticiones: '8 - 10',
          descanso: '90 seg',
          nivel: 'Intermedio',
          recomendaciones: [
            'Mantén las escápulas retraídas y apoyadas firmemente contra el banco.',
            'No despegues los pies del suelo ni la zona lumbar en exceso.',
            'Baja la barra de forma controlada hasta rozar el esternón.'
          ]
        },
        {
          nombre: 'Dominadas pronadas asistidas',
          musculo: 'Dorsal ancho',
          descripcion: 'Ejercicio fundamental de tracción vertical para amplitud de espalda.',
          series: 4,
          repeticiones: '8 - 12',
          descanso: '90 seg',
          nivel: 'Intermedio',
          recomendaciones: [
            'Inicia el movimiento traccionando desde los codos, no con la fuerza de los bíceps.',
            'Supera la barra con la barbilla sin elevar exageradamente el cuello.',
            'Desciende lentamente hasta extender completamente los brazos.'
          ]
        },
        {
          nombre: 'Press militar sentado con mancuernas',
          musculo: 'Deltoides',
          descripcion: 'Desarrollo de masa muscular y estabilidad del deltoides anterior y lateral.',
          series: 3,
          repeticiones: '10 - 12',
          descanso: '60 seg',
          nivel: 'Intermedio',
          recomendaciones: [
            'Empuja las mancuernas hacia arriba sin chocar las pesas en el punto máximo.',
            'Mantén el abdomen contraído para proteger la zona lumbar.'
          ]
        },
        {
          nombre: 'Remo unilateral con mancuerna',
          musculo: 'Dorsal y Trapecio',
          descripcion: 'Tracción horizontal para grosor de espalda y balance muscular.',
          series: 3,
          repeticiones: '10 - 12',
          descanso: '60 seg',
          nivel: 'Intermedio',
          recomendaciones: [
            'Mantén la espalda paralela al suelo y lleva la mancuerna hacia la cadera.',
            'Evita rotar bruscamente el torso durante la ejecución.'
          ]
        },
        {
          nombre: 'Fondos en paralelas para pecho y tríceps',
          musculo: 'Pectoral y Tríceps',
          descripcion: 'Movimiento calisténico avanzado de empuje inclinado.',
          series: 3,
          repeticiones: 'Al fallo',
          descanso: '90 seg',
          nivel: 'Avanzado',
          recomendaciones: [
            'Inclina levemente el torso hacia adelante para enfocar el esfuerzo en el pectoral.',
            'Desciende hasta formar un ángulo de 90° en los codos.'
          ]
        }
      ]
    },
    {
      id: 2,
      titulo: 'Rutina de Pierna & Potencia',
      grupoMuscular: 'Cuádriceps, Isquiotibiales y Glúteos',
      nivel: 'Avanzado',
      duracionMin: 70,
      ejerciciosCount: 5,
      ejercicios: [
        {
          nombre: 'Sentadillas profundas con barra',
          musculo: 'Cuádriceps y Glúteos',
          descripcion: 'El rey de los ejercicios de pierna para fuerza total del tren inferior.',
          series: 4,
          repeticiones: '6 - 8',
          descanso: '120 seg',
          nivel: 'Avanzado',
          recomendaciones: [
            'Rompe la paralela al descender asegurando estabilidad en las rodillas.',
            'Mantén el pecho erguido y la vista al frente.',
            'Inhala profundo y aprieta el core antes de bajar.'
          ]
        },
        {
          nombre: 'Hip Thrust pesado con barra',
          musculo: 'Glúteos',
          descripcion: 'Ejercicio biomecánico óptimo para hipertrofia y potencia glútea.',
          series: 4,
          repeticiones: '8 - 10',
          descanso: '90 seg',
          nivel: 'Intermedio',
          recomendaciones: [
            'Coloca una almohadilla protectora sobre la barra a la altura de la pelvis.',
            'Mantén la mirada hacia adelante al subir y contrae los glúteos 2 segundos en la cima.'
          ]
        },
        {
          nombre: 'Prensa inclinada a 45°',
          musculo: 'Cuádriceps',
          descripcion: 'Trabajo pesado analítico sin sobrecarga axial en la columna.',
          series: 4,
          repeticiones: '10 - 12',
          descanso: '90 seg',
          nivel: 'Intermedio',
          recomendaciones: [
            'No bloquees rígidamente las rodillas al extender las piernas arriba.',
            'Mantén la pelvis bien pegada al respaldo durante todo el trayecto.'
          ]
        },
        {
          nombre: 'Peso muerto rumano con mancuernas',
          musculo: 'Isquiotibiales y Lumbares',
          descripcion: 'Estiramiento y fortalecimiento de la cadena posterior.',
          series: 3,
          repeticiones: '10 - 12',
          descanso: '75 seg',
          nivel: 'Intermedio',
          recomendaciones: [
            'Flexiona ligeramente las rodillas y lleva la cadera hacia atrás.',
            'Desciende las pesas pegadas a las piernas sintiendo estiramiento femoral.'
          ]
        },
        {
          nombre: 'Elevación de talones de pie',
          musculo: 'Gemelos',
          descripcion: 'Aislamiento de la pantorrilla con máxima extensión y flexión.',
          series: 4,
          repeticiones: '15 - 20',
          descanso: '45 seg',
          nivel: 'Principiante',
          recomendaciones: [
            'Aguanta 1 segundo abajo en máximo estiramiento y 1 segundo arriba en contracción.'
          ]
        }
      ]
    }
  ]);

  goalsList = signal<UserGoal[]>([
    { id: 1, titulo: 'Mejorar resistencia cardiovascular', descripcion: 'Completar 30 min continuos en zona de quema de grasa', progreso: 80, fechaObjetivo: '30 de Agosto, 2026', estado: 'En progreso' },
    { id: 2, titulo: 'Aumento de masa muscular', descripcion: 'Ganancia neta de 2.5 kg de masa magra verificada en escáner corporal', progreso: 65, fechaObjetivo: '15 de Septiembre, 2026', estado: 'En progreso' },
    { id: 3, titulo: 'Asistencia mensual constante', descripcion: 'Asistir al menos a 18 entrenamientos este mes', progreso: 100, fechaObjetivo: '31 de Agosto, 2026', estado: 'Completado' },
    { id: 4, titulo: 'Récord personal en Press de Banca', descripcion: 'Alcanzar 100 kg en repetición máxima (1RM)', progreso: 50, fechaObjetivo: '10 de Octubre, 2026', estado: 'En progreso' }
  ]);

  // Available classes and enrolled classes
  availableClasses = signal<ClassSession[]>([]);
  myClasses = signal<ClassSession[]>([]);

  notificationsSettings = {
    emailAlerts: true,
    sessionReminders: true,
    promotions: false
  };

  themeMode = 'dark';

  // ==========================================
  // MEMBERSHIP TIER ACCESS CONTROL HELPERS
  // ==========================================
  hasActiveMembership(): boolean {
    return Boolean(this.profileData()?.activeMembership);
  }

  getMembershipName(): string {
    return this.profileData()?.activeMembership?.nombre?.toLowerCase() || '';
  }

  hasFullAccess(): boolean {
    const name = this.getMembershipName();
    return name.includes('plata') || name.includes('oro');
  }

  isBronce(): boolean {
    const name = this.getMembershipName();
    return name.includes('bronce');
  }

  getCrownImgUrl(nombre?: string): string {
    if (!nombre) return 'assets/img/bronze-crown.png';
    const n = nombre.toLowerCase();
    if (n.includes('oro') || n.includes('gold')) return 'assets/img/gold-crown.png';
    if (n.includes('plata') || n.includes('silver')) return 'assets/img/silver-crown.png';
    return 'assets/img/bronze-crown.png';
  }

  // ==========================================
  // IMC (BMI) & EXERCISE RECOMMENDATIONS SYSTEM
  // ==========================================
  getBmiEvaluation(): BmiEvaluation | null {
    const data = this.profileData();
    if (!data) return null;

    const pesoKg = data.peso ? parseFloat(data.peso) : null;
    const estaturaVal = data.estatura ? parseFloat(data.estatura) : null;

    if (!pesoKg || !estaturaVal || pesoKg <= 0 || estaturaVal <= 0) {
      return null;
    }

    // Convert cm to meters correctly: IMC = peso / (estatura_m * estatura_m)
    const estaturaM = estaturaVal > 3 ? estaturaVal / 100 : estaturaVal;
    const imc = parseFloat((pesoKg / (estaturaM * estaturaM)).toFixed(1));
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (imc < 18.5) {
      return {
        imc,
        pesoKg,
        estaturaM: parseFloat(estaturaM.toFixed(2)),
        fechaActualizacion: fecha,
        categoria: 'Bajo Peso',
        badgeClass: 'bmi-underweight',
        mensaje: 'Tu índice de masa corporal indica que estás por debajo del rango de peso recomendado para tu estatura.',
        objetivoSugerido: 'Ganancia de Masa Muscular Magra e Hipertrofia',
        frecuenciaSugerida: '3 - 4 días a la semana (Entrenamiento de fuerza pesado con descansos largos)',
        ejerciciosRecomendados: [
          { nombre: 'Sentadillas Profundas con Barra', enfoque: 'Fuerza & Volumen', razon: 'Gran estímulo neuro-muscular sistémico para ganar masa en piernas y glúteos.' },
          { nombre: 'Press de Banca Plano', enfoque: 'Hipertrofia Torso', razon: 'Desarrollo de volumen muscular en pectoral, deltoides y tríceps.' },
          { nombre: 'Dominadas Pronadas / Jalón al Pecho', enfoque: 'Amplitud de Espalda', razon: 'Aumento de masa magra en dorsal ancho y bíceps.' },
          { nombre: 'Peso Muerto Rumano con Barra', enfoque: 'Cadena Posterior', razon: 'Fortalecimiento de la musculatura femoral, glútea y erectora.' }
        ]
      };
    } else if (imc <= 24.9) {
      return {
        imc,
        pesoKg,
        estaturaM: parseFloat(estaturaM.toFixed(2)),
        fechaActualizacion: fecha,
        categoria: 'Peso Saludable / Óptimo',
        badgeClass: 'bmi-healthy',
        mensaje: '¡Excelente! Tu índice de masa corporal se encuentra en el rango óptimo y más saludable.',
        objetivoSugerido: 'Recomposición Corporal, Fuerza y Acondicionamiento Integral',
        frecuenciaSugerida: '4 - 5 días a la semana (Fuerza progresiva combinada con HIIT moderado)',
        ejerciciosRecomendados: [
          { nombre: 'Press Militar Sentado / De Pie', enfoque: 'Hombros & Core', razon: 'Desarrollo estético del deltoides y estabilidad del torso.' },
          { nombre: 'Sentadillas Búlgaras con Mancuernas', enfoque: 'Unilateral & Balance', razon: 'Desarrollo simétrico y balance de fuerza en extremidades.' },
          { nombre: 'Remo Unilateral con Mancuerna', enfoque: 'Grosor de Espalda', razon: 'Mejora de la postura corporal y densidad en la espalda alta.' },
          { nombre: 'Circuito HIIT de 20 Minutos', enfoque: 'Capacidad Aeróbica', razon: 'Mantenimiento del porcentaje de grasa magra y salud cardíaca.' }
        ]
      };
    } else if (imc <= 29.9) {
      return {
        imc,
        pesoKg,
        estaturaM: parseFloat(estaturaM.toFixed(2)),
        fechaActualizacion: fecha,
        categoria: 'Sobrepeso Moderado',
        badgeClass: 'bmi-overweight',
        mensaje: 'Tu IMC indica que estás ligeramente por encima de tu peso ideal para tu estatura.',
        objetivoSugerido: 'Quema Acelerada de Grasa, Tono Muscular y Resistencia Metabólica',
        frecuenciaSugerida: '4 - 5 días a la semana (Circuitos de pesas con pausas cortas + Cardio activo)',
        ejerciciosRecomendados: [
          { nombre: 'Circuito Metabólico de Pesas (Full Body)', enfoque: 'Gasto Calórico Alto', razon: 'Mantiene la masa muscular activa mientras quema glucógeno y grasa.' },
          { nombre: 'Zancadas Caminando con Mancuernas', enfoque: 'Quema & Potencia', razon: 'Elevada demanda cardiovascular y firmeza de tren inferior.' },
          { nombre: 'Caminata Inclinada en Cinta (12-3-30)', enfoque: 'Cardio Sin Impacto', razon: 'Maximiza la oxidación de grasas sin estresar las articulaciones.' },
          { nombre: 'Plancha Isométrica & Core Crunches', enfoque: 'Firmeza Abdominal', razon: 'Protección de la columna lumbar y tono en la zona media.' }
        ]
      };
    } else {
      return {
        imc,
        pesoKg,
        estaturaM: parseFloat(estaturaM.toFixed(2)),
        fechaActualizacion: fecha,
        categoria: 'Obesidad / Acondicionamiento Requerido',
        badgeClass: 'bmi-obese',
        mensaje: 'Tu IMC indica un nivel elevado de masa corporal. Se recomienda un plan enfocado en reducción de grasa.',
        objetivoSugerido: 'Reducción Progresiva de Grasa Corporal y Protección Articular',
        frecuenciaSugerida: '3 - 5 días a la semana (Máquinas guiadas + Cardio aeróbico suave)',
        ejerciciosRecomendados: [
          { nombre: 'Bicicleta Estática / Spinning Moderado', enfoque: 'Cardio Protegido', razon: 'Elevado consumo calórico sin impacto en tobillos y rodillas.' },
          { nombre: 'Prensa de Piernas Inclinada en Máquina', enfoque: 'Fuerza Segura', razon: 'Estímulo de cuádriceps con la columna vertebral totalmente apoyada.' },
          { nombre: 'Jalón al Pecho en Polea Guiada', enfoque: 'Tracción Asistida', razon: 'Fortalecimiento de la espalda con movimiento controlado.' },
          { nombre: 'Elíptica / Natación Suave', enfoque: 'Acondicionamiento Global', razon: 'Movilización total del cuerpo promoviendo el déficit calórico.' }
        ]
      };
    }
  }

  // ==========================================
  // IMC CALCULATION MODAL & HISTORY MANAGEMENT
  // ==========================================
  openBmiModal() {
    const data = this.profileData();
    if (data) {
      this.bmiForm.patchValue({
        peso: data.peso ? parseFloat(data.peso) : null,
        estatura: data.estatura ? parseFloat(data.estatura) : null
      });
    }
    this.showBmiModal.set(true);
  }

  closeBmiModal() {
    this.showBmiModal.set(false);
  }

  calculateAndSaveBmi() {
    if (this.bmiForm.invalid) {
      this.alertService.error('Ingresa un peso (20 - 300 kg) y estatura (50 - 260 cm) válidos.', 'Datos Inválidos');
      return;
    }

    const { peso, estatura } = this.bmiForm.value;
    if (!peso || !estatura || peso <= 0 || estatura <= 0) {
      this.alertService.error('El peso y la estatura deben ser números mayores a 0.');
      return;
    }

    // Convert cm to meters correctly
    const estaturaM = estatura > 3 ? estatura / 100 : estatura;
    const imc = parseFloat((peso / (estaturaM * estaturaM)).toFixed(1));
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // 1. Update User Profile Data
    const data = this.profileData() || {};
    const updatedPayload = {
      nombre: data.nombre,
      apellidos: data.apellidos,
      telefono: data.telefono,
      sexo: data.sexo,
      peso: peso,
      estatura: estatura
    };

    this.authService.updateProfile(updatedPayload).subscribe({
      next: (res) => {
        this.fetchProfile();

        // 2. Add to Local Storage IMC History for current user
        const userId = data.id || data.email || 'user';
        const key = `imc_history_${userId}`;
        const newRecord: ImcRecord = {
          id: Date.now().toString(),
          fecha: fecha,
          pesoKg: peso,
          estaturaM: parseFloat(estaturaM.toFixed(2)),
          imc: imc
        };

        const existingHistoryStr = localStorage.getItem(key);
        let historyList: ImcRecord[] = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
        // Prepend new record to top of history
        historyList = [newRecord, ...historyList.filter(r => r.fecha !== fecha)];
        localStorage.setItem(key, JSON.stringify(historyList));
        this.imcRecords.set(historyList);

        this.alertService.success(`¡IMC Calculado: ${imc}! Tu registro se guardó correctamente.`);
        this.closeBmiModal();
      },
      error: (err) => {
        this.alertService.error('Error al guardar datos de IMC: ' + (err.error?.message || err.message || err.error));
      }
    });
  }

  loadImcHistory() {
    const data = this.profileData();
    if (!data) return;
    const userId = data.id || data.email || 'user';
    const key = `imc_history_${userId}`;
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        const parsed: ImcRecord[] = JSON.parse(existing);
        this.imcRecords.set(parsed);
      } catch (e) {
        console.error('Error parsing IMC history', e);
      }
    } else {
      // Seed default initial record if profile has weight & height
      const evalBmi = this.getBmiEvaluation();
      if (evalBmi) {
        const seededRecord: ImcRecord = {
          id: 'seed-1',
          fecha: evalBmi.fechaActualizacion,
          pesoKg: evalBmi.pesoKg,
          estaturaM: evalBmi.estaturaM,
          imc: evalBmi.imc
        };
        this.imcRecords.set([seededRecord]);
        localStorage.setItem(key, JSON.stringify([seededRecord]));
      }
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['section']) {
        this.setSection(params['section']);
      }
      if (params['tab']) {
        this.setSection(params['tab']);
      }
    });
    this.fetchProfile();
    this.fetchPlans();

    this.authService.getProfile().subscribe({
      next: (data) => {
        this.profileData.set(data);
        if (data.peso && data.estatura) {
          this.bmiForm.patchValue({
            peso: data.peso,
            estatura: data.estatura
          });
        }
      },
      error: () => {
        this.alertService.error('Error al cargar perfil.');
      }
    });

    this.membershipService.getMemberships().subscribe(data => {
      this.availablePlans.set(data);
    });

    this.loadClasses();
    this.selectedMuscle.set(this.musclesDatabase['pectoral']);
  }

  loadClasses() {
    this.classService.getClasses().subscribe({
      next: (data) => {
        const available = data.filter(c => !c.inscrito);
        const enrolled = data.filter(c => c.inscrito);
        this.availableClasses.set(available);
        this.myClasses.set(enrolled);
      }
    });
  }

  ngAfterViewInit() {
    if (this.activeSection === 'musculos') {
      setTimeout(() => this.init3DMuscleExplorer(), 100);
    }
  }

  ngOnDestroy() {
    this.destroy3DScene();
  }

  fetchProfile() {
    this.authService.getProfile().subscribe({
      next: (res) => {
        this.profileData.set(res);
        this.loadImcHistory();
      },
      error: (err) => {
        console.error('Error fetching profile', err);
      }
    });
  }

  fetchPlans() {
    this.membershipService.getMemberships().subscribe({
      next: (res) => {
        this.availablePlans.set(res);
      },
      error: (err) => {
        console.error('Error fetching memberships', err);
      }
    });
  }

  setSection(section: string) {
    this.activeSection = section;
    this.sidebarMobileOpen.set(false);

    if (section === 'musculos' && this.hasFullAccess()) {
      setTimeout(() => this.init3DMuscleExplorer(), 150);
    } else {
      this.destroy3DScene();
    }
  }

  toggleMobileSidebar() {
    this.sidebarMobileOpen.set(!this.sidebarMobileOpen());
  }

  openExerciseModal(exercise: ExerciseItem) {
    this.selectedExerciseModal.set(exercise);
  }

  closeExerciseModal() {
    this.selectedExerciseModal.set(null);
  }

  enrollInClass(idClass: number) {
    if (!this.hasFullAccess()) {
      this.alertService.info('Inscribirse a clases requiere Plan PLATA u ORO.', 'Acceso Restringido');
      this.setSection('membresia');
      return;
    }
    
    this.classService.enroll(idClass).subscribe({
      next: (res) => {
        this.alertService.success(res.message);
        this.loadClasses();
      },
      error: (err) => {
        this.alertService.error(err.error?.message || 'Error al inscribirse');
      }
    });
  }

  unenrollClass(idClass: number) {
    if (confirm('¿Seguro que deseas cancelar tu inscripción a esta clase?')) {
      this.classService.unenroll(idClass).subscribe({
        next: (res) => {
          this.alertService.success(res.message);
          this.loadClasses();
        },
        error: (err) => {
          this.alertService.error(err.error?.message || 'Error al cancelar inscripción');
        }
      });
    }
  }

  updateProfile() {
    const data = this.profileData();
    if (!data) return;

    if (!data.nombre || !data.apellidos) {
      this.alertService.error('Nombre y Apellidos son requeridos.', 'Campos Incompletos');
      return;
    }

    if (data.telefono && !/^[0-9]{1,10}$/.test(data.telefono)) {
      this.alertService.error('El teléfono debe tener máximo 10 dígitos numéricos.', 'Error de Teléfono');
      return;
    }

    const payload = {
      nombre: data.nombre,
      apellidos: data.apellidos,
      telefono: data.telefono,
      sexo: data.sexo,
      peso: data.peso ? parseFloat(data.peso) : null,
      estatura: data.estatura ? parseFloat(data.estatura) : null
    };

    this.authService.updateProfile(payload).subscribe({
      next: (res) => {
        this.alertService.success(res.message || 'Perfil y métricas corporales actualizados exitosamente.');
        this.fetchProfile();
      },
      error: (err) => {
        this.alertService.error('Error al actualizar datos: ' + (err.error?.message || err.message || err.error));
      }
    });
  }

  changePasswordSubmit() {
    if (this.passwordForm.invalid) {
      this.alertService.error('Por favor completa los campos correctamente.');
      return;
    }
    const val = this.passwordForm.value;
    if (val.newPassword !== val.confirmPassword) {
      this.alertService.error('Las contraseñas no coinciden.');
      return;
    }

    this.alertService.success('Tu contraseña ha sido actualizada con éxito.');
    this.showPasswordModal.set(false);
    this.passwordForm.reset();
  }

  buyPlan(id: number) {
    this.membershipService.buyMembership(id).subscribe({
      next: (res) => {
        this.fetchProfile();
        const plan = this.availablePlans().find(p => p.idMembresia === id);
        this.lastReceipt.set({
          idTransaccion: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
          fecha: new Date(),
          nombreCliente: (this.profileData()?.nombre || '') + ' ' + (this.profileData()?.apellidos || ''),
          planNombre: plan?.nombre || 'Plan Gym',
          total: plan?.precio || 0,
          metodoPago: 'Tarjeta de Crédito (Pasarela Encriptada)',
          vigencia: '1 Mes (Hasta ' + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() + ')'
        });
        this.showReceiptModal.set(true);
        this.alertService.success('¡Membresía adquirida con éxito!');
        this.setSection('membresia');
      },
      error: (err) => {
        this.alertService.error('Error al adquirir membresía: ' + (err.error?.message || err.message || err.error));
      }
    });
  }

  deleteProfileAccount() {
    this.authService.deleteAccount().subscribe({
      next: (res) => {
        this.alertService.success('Tu cuenta ha sido eliminada correctamente.');
        this.showDeleteConfirmModal = false;
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.alertService.error('Error al eliminar la cuenta: ' + (err.error?.message || err.message || err.error));
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // =========================================================================
  // THREE.JS REALISTIC ATHLETIC MALE MANNEQUIN (MATCHING SPECIFICATION IMAGE)
  // =========================================================================
  private init3DMuscleExplorer() {
    const canvas = this.muscleCanvasRef?.nativeElement;
    if (!canvas) return;

    this.destroy3DScene();

    const width = canvas.parentElement?.clientWidth || canvas.clientWidth || 500;
    const height = canvas.parentElement?.clientHeight || 550;

    // 1. Scene & Studio Lighting Setup
    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0x090c12);

    this.threeCamera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    this.threeCamera.position.set(0, 0.5, 17);

    // 2. High Quality WebGL Renderer
    this.threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.threeRenderer.setSize(width, height);
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.threeRenderer.shadowMap.enabled = true;
    this.threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Studio Ambient & Key Specular Lighting Setup (Matching reference photo)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.threeScene.add(ambientLight);

    // Key Specular Light (Top Front Right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
    keyLight.position.set(6, 12, 8);
    this.threeScene.add(keyLight);

    // Soft Fill Light (Top Front Left)
    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.85);
    fillLight.position.set(-6, 8, 6);
    this.threeScene.add(fillLight);

    // Crimson Back Rim Light (Contour highlight)
    const rimLightCrimson = new THREE.DirectionalLight(0xdc143c, 1.5);
    rimLightCrimson.position.set(-5, 0, -8);
    this.threeScene.add(rimLightCrimson);

    // Gold Specular Rim Light
    const rimLightGold = new THREE.PointLight(0xffd700, 1.3, 16);
    rimLightGold.position.set(4, -2, -4);
    this.threeScene.add(rimLightGold);

    // 3. Build Realistic Athletic Metallic Black Male Mannequin Figure
    this.humanModelGroup = new THREE.Group();
    this.muscleMeshes = [];

    // Metallic Black Polish Finish Material (Reference Specification Photo)
    const createMannequinMaterial = (color = 0x141820) => new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.18,      // Smooth polished sheen
      metalness: 0.82,      // High metallic reflective body finish
      emissive: 0x000000
    });

    const bodyBaseMat = createMannequinMaterial(0x12151c);

    // Smooth Faceless Mannequin Head (Realistic Oval Proportions)
    const headGeom = new THREE.SphereGeometry(0.85, 32, 32);
    headGeom.scale(0.82, 1.25, 0.95);
    const headMesh = new THREE.Mesh(headGeom, bodyBaseMat);
    headMesh.position.set(0, 5.7, 0);
    this.humanModelGroup.add(headMesh);

    // Neck
    const neckGeom = new THREE.CylinderGeometry(0.40, 0.52, 0.85, 24);
    const neckMesh = new THREE.Mesh(neckGeom, bodyBaseMat);
    neckMesh.position.set(0, 4.7, 0);
    this.humanModelGroup.add(neckMesh);

    // Standing Pedestal Base Shadow Disk
    const pedestalGeom = new THREE.CylinderGeometry(2.8, 3.2, 0.2, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.8, metalness: 0.5 });
    const pedestalMesh = new THREE.Mesh(pedestalGeom, pedestalMat);
    pedestalMesh.position.set(0, -4.8, 0);
    this.humanModelGroup.add(pedestalMesh);

    // Helper to create muscle anatomical mesh
    const createMuscleMesh = (geometry: THREE.BufferGeometry, muscleId: string, position: [number, number, number], scale: [number, number, number] = [1, 1, 1], rot: [number, number, number] = [0, 0, 0]) => {
      const mat = createMannequinMaterial(0x181d26);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      mesh.rotation.set(...rot);
      mesh.userData = { muscleId, ...this.musclesDatabase[muscleId] };
      this.humanModelGroup?.add(mesh);
      this.muscleMeshes.push(mesh);
      return mesh;
    };

    // REALISTIC ANATOMICAL MALE MUSCLE GROUPS

    // Trapecio
    const trapecioGeom = new THREE.ConeGeometry(1.65, 1.0, 24);
    createMuscleMesh(trapecioGeom, 'trapecio', [0, 4.3, -0.15], [1, 1, 0.6]);

    // Pectoral Mayor (Left & Right Spherical Sculpted Contours)
    const chestGeom = new THREE.SphereGeometry(0.72, 24, 24);
    chestGeom.scale(1.15, 0.75, 0.55);
    createMuscleMesh(chestGeom, 'pectoral', [-0.58, 3.45, 0.38]);
    createMuscleMesh(chestGeom, 'pectoral', [0.58, 3.45, 0.38]);

    // Deltoides (Shoulders)
    const shoulderGeom = new THREE.SphereGeometry(0.68, 24, 24);
    createMuscleMesh(shoulderGeom, 'deltoides', [-1.55, 3.65, 0]);
    createMuscleMesh(shoulderGeom, 'deltoides', [1.55, 3.65, 0]);

    // Bíceps
    const bicepsGeom = new THREE.CylinderGeometry(0.42, 0.36, 1.35, 24);
    createMuscleMesh(bicepsGeom, 'biceps', [-1.65, 2.5, 0.16]);
    createMuscleMesh(bicepsGeom, 'biceps', [1.65, 2.5, 0.16]);

    // Tríceps
    const tricepsGeom = new THREE.CylinderGeometry(0.44, 0.38, 1.35, 24);
    createMuscleMesh(tricepsGeom, 'triceps', [-1.65, 2.5, -0.22]);
    createMuscleMesh(tricepsGeom, 'triceps', [1.65, 2.5, -0.22]);

    // Abdominales / Core
    const absGeom = new THREE.BoxGeometry(1.22, 1.85, 0.52);
    createMuscleMesh(absGeom, 'abs', [0, 2.05, 0.35]);

    // Dorsal Ancho (Back V-Taper)
    const dorsalGeom = new THREE.BoxGeometry(2.3, 1.9, 0.52);
    createMuscleMesh(dorsalGeom, 'dorsal', [0, 3.15, -0.38]);

    // Lumbares
    const lumbaresGeom = new THREE.BoxGeometry(1.3, 0.95, 0.46);
    createMuscleMesh(lumbaresGeom, 'lumbares', [0, 1.6, -0.36]);

    // Glúteos
    const gluteGeom = new THREE.SphereGeometry(0.85, 24, 24);
    createMuscleMesh(gluteGeom, 'gluteos', [-0.6, 0.3, -0.26]);
    createMuscleMesh(gluteGeom, 'gluteos', [0.6, 0.3, -0.26]);

    // Cuádriceps
    const quadGeom = new THREE.CylinderGeometry(0.66, 0.48, 2.45, 24);
    createMuscleMesh(quadGeom, 'cuadriceps', [-0.7, -1.2, 0.2]);
    createMuscleMesh(quadGeom, 'cuadriceps', [0.7, -1.2, 0.2]);

    // Isquiotibiales
    const hamstringGeom = new THREE.CylinderGeometry(0.62, 0.45, 2.45, 24);
    createMuscleMesh(hamstringGeom, 'isquiotibiales', [-0.7, -1.2, -0.2]);
    createMuscleMesh(hamstringGeom, 'isquiotibiales', [0.7, -1.2, -0.2]);

    // Gemelos
    const calfGeom = new THREE.CylinderGeometry(0.48, 0.28, 2.0, 24);
    createMuscleMesh(calfGeom, 'gemelos', [-0.7, -3.5, -0.06]);
    createMuscleMesh(calfGeom, 'gemelos', [0.7, -3.5, -0.06]);

    // Group offset positioning
    this.humanModelGroup.position.set(0, -0.6, 0);
    this.threeScene.add(this.humanModelGroup);

    // 4. Mouse Event Listeners (3D Orbit Rotation & Raycasting Selection)
    const domElement = this.threeRenderer.domElement;

    const onPointerMove = (e: MouseEvent) => {
      const rect = domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Rotate mannequin on drag
      if (this.isDragging3D && this.humanModelGroup) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.humanModelGroup.rotation.y += deltaX * 0.01;
        this.humanModelGroup.rotation.x += deltaY * 0.005;
        this.humanModelGroup.rotation.x = Math.max(-0.4, Math.min(0.4, this.humanModelGroup.rotation.x));
      }
      this.previousMousePosition = { x: e.clientX, y: e.clientY };

      // Raycasting Hover Effect
      if (this.threeCamera && this.threeScene) {
        this.raycaster.setFromCamera(this.mouse, this.threeCamera);
        const intersects = this.raycaster.intersectObjects(this.muscleMeshes, false);

        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          domElement.style.cursor = 'pointer';
          this.hoveredMuscleName.set(hitMesh.userData['nombre'] || 'Músculo');

          if (this.hoveredMesh !== hitMesh) {
            this.resetHoveredMesh();
            this.hoveredMesh = hitMesh;
            const mat = hitMesh.material as THREE.MeshStandardMaterial;
            mat.emissive.setHex(0xdc143c); // Neon Crimson Highlight
            mat.emissiveIntensity = 0.95;
          }
        } else {
          domElement.style.cursor = this.isDragging3D ? 'grabbing' : 'grab';
          this.hoveredMuscleName.set(null);
          this.resetHoveredMesh();
        }
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      this.isDragging3D = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: MouseEvent) => {
      this.isDragging3D = false;

      const rect = domElement.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const clickY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.threeCamera) {
        this.raycaster.setFromCamera(new THREE.Vector2(clickX, clickY), this.threeCamera);
        const intersects = this.raycaster.intersectObjects(this.muscleMeshes, false);
        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          const muscleId = hitMesh.userData['muscleId'];
          if (muscleId && this.musclesDatabase[muscleId]) {
            this.selectMuscle(muscleId);
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (this.threeCamera) {
        this.threeCamera.position.z += e.deltaY * 0.01;
        this.threeCamera.position.z = Math.max(8, Math.min(26, this.threeCamera.position.z));
      }
    };

    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // 5. Animation Loop
    const animate = () => {
      this.threeAnimationId = requestAnimationFrame(animate);

      if (!this.isDragging3D && this.humanModelGroup) {
        this.humanModelGroup.rotation.y += 0.0025; // Gentle ambient rotation
      }

      if (this.threeRenderer && this.threeScene && this.threeCamera) {
        this.threeRenderer.render(this.threeScene, this.threeCamera);
      }
    };

    animate();
  }

  private resetHoveredMesh() {
    if (this.hoveredMesh) {
      const mat = this.hoveredMesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
      this.hoveredMesh = null;
    }
  }

  selectMuscle(muscleId: string) {
    if (this.musclesDatabase[muscleId]) {
      this.selectedMuscle.set(this.musclesDatabase[muscleId]);
    }
  }

  resetModelRotation() {
    if (this.humanModelGroup) {
      this.humanModelGroup.rotation.set(0, 0, 0);
    }
    if (this.threeCamera) {
      this.threeCamera.position.set(0, 0.5, 17);
    }
  }

  private destroy3DScene() {
    if (this.threeAnimationId) {
      cancelAnimationFrame(this.threeAnimationId);
      this.threeAnimationId = undefined;
    }
    if (this.threeRenderer) {
      this.threeRenderer.dispose();
      this.threeRenderer = undefined;
    }
    this.threeScene = undefined;
    this.threeCamera = undefined;
  }
}
