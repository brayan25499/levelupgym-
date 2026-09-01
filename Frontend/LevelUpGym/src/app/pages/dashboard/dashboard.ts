import { Component, inject, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { ClassSessionService, ClassSession } from '../../services/class-session.service';
import { AlertService } from '../../services/alert.service';
import { ProgressService, ProgressReport } from '../../services/progress.service';
import { GoalService, GoalTypeItem, UserGoalDto } from '../../services/goal.service';
import { MembershipService, Membership, UpgradeCalculation } from '../../services/membership';
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
  private progressService = inject(ProgressService);
  private goalService = inject(GoalService);
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

  // IMC & Progress State
  imcRecords = signal<ImcRecord[]>([]);
  progressReports = signal<ProgressReport[]>([]);
  userGoals = signal<UserGoalDto[]>([]);
  availableGoalTypes = signal<GoalTypeItem[]>([]);
  showBmiModal = signal<boolean>(false);
  showNewGoalModal = signal<boolean>(false);

  // Upgrade Membership State
  showUpgradeModal = signal<boolean>(false);
  upgradeCalc = signal<UpgradeCalculation | null>(null);
  isUpgrading = signal<boolean>(false);

  bmiForm = this.fb.group({
    peso: [null as number | null, [Validators.required, Validators.min(20), Validators.max(300)]],
    estatura: [null as number | null, [Validators.required, Validators.min(50), Validators.max(260)]],
    cintura: [null as number | null, [Validators.min(0), Validators.max(300)]],
    pecho: [null as number | null, [Validators.min(0), Validators.max(300)]],
    brazo: [null as number | null, [Validators.min(0), Validators.max(150)]],
    pierna: [null as number | null, [Validators.min(0), Validators.max(200)]],
    fechaMedicion: ['']
  });

  goalForm = this.fb.group({
    idTipoObjetivo: [null as number | null, Validators.required],
    valorMeta: [null as number | null, [Validators.required, Validators.min(0.1)]],
    fechaLimite: [''],
    descripcion: ['']
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

  getActiveMembership(): any {
    return this.profileData()?.activeMembership ?? null;
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
          { nombre: 'Circuito HIIT de 20 Minutos', enfoque: 'Capacidad Aeróbica', razon: 'Mantenimiento del tono muscular magro y salud cardíaca.' }
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
        objetivoSugerido: 'Acondicionamiento Físico, Tono Muscular y Resistencia Metabólica',
        frecuenciaSugerida: '4 - 5 días a la semana (Circuitos de pesas con pausas cortas + Cardio activo)',
        ejerciciosRecomendados: [
          { nombre: 'Circuito Metabólico de Pesas (Full Body)', enfoque: 'Gasto Calórico Alto', razon: 'Mantiene la masa muscular activa mientras optimiza el metabolismo energético.' },
          { nombre: 'Zancadas Caminando con Mancuernas', enfoque: 'Quema & Potencia', razon: 'Elevada demanda cardiovascular y firmeza de tren inferior.' },
          { nombre: 'Caminata Inclinada en Cinta (12-3-30)', enfoque: 'Cardio Sin Impacto', razon: 'Maximiza el gasto calórico sin estresar las articulaciones.' },
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
        mensaje: 'Tu IMC indica un nivel elevado de masa corporal. Se recomienda un plan enfocado en recomposición corporal y déficit calórico progresivo.',
        objetivoSugerido: 'Recomposición Corporal Progresiva y Protección Articular',
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
  get previewImc(): number | null {
    const val = this.bmiForm.value;
    if (!val.peso || !val.estatura || val.peso <= 0 || val.estatura <= 0) return null;
    const estaturaM = val.estatura > 3 ? val.estatura / 100 : val.estatura;
    return parseFloat((val.peso / (estaturaM * estaturaM)).toFixed(2));
  }

  get pesoActualVal(): number | null {
    const reports = this.progressReports();
    if (reports.length > 0 && reports[reports.length - 1].peso) {
      return reports[reports.length - 1].peso;
    }
    const data = this.profileData();
    return data?.peso ? parseFloat(data.peso) : null;
  }

  get estaturaActualVal(): number | null {
    const reports = this.progressReports();
    if (reports.length > 0 && reports[reports.length - 1].altura) {
      return parseFloat(reports[reports.length - 1].altura);
    }
    const data = this.profileData();
    if (data?.estatura) {
      const parsed = parseFloat(data.estatura);
      return parsed > 3 ? parseFloat((parsed / 100).toFixed(2)) : parsed;
    }
    return null;
  }

  get cinturaActualVal(): number | null {
    return this.ultimaMedicionObj?.cintura ?? null;
  }

  get pechoActualVal(): number | null {
    return this.ultimaMedicionObj?.pecho ?? null;
  }

  get brazoActualVal(): number | null {
    return this.ultimaMedicionObj?.brazo ?? null;
  }

  get piernaActualVal(): number | null {
    return this.ultimaMedicionObj?.pierna ?? null;
  }

  get imcActualVal(): number | null {
    const reports = this.progressReports();
    if (reports.length > 0 && reports[reports.length - 1].imc) {
      return parseFloat(reports[reports.length - 1].imc!);
    }
    return this.getBmiEvaluation()?.imc ?? null;
  }

  get pesoInicialVal(): number | null {
    const reports = this.progressReports();
    if (reports.length > 0 && reports[0].peso) {
      return reports[0].peso;
    }
    return this.pesoActualVal;
  }

  get diferenciaPesoVal(): number | null {
    const actual = this.pesoActualVal;
    const inicial = this.pesoInicialVal;
    if (actual !== null && inicial !== null) {
      return parseFloat((actual - inicial).toFixed(2));
    }
    return null;
  }

  get ultimaMedicionObj(): ProgressReport | null {
    const reports = this.progressReports();
    return reports.length > 0 ? reports[reports.length - 1] : null;
  }

  get fechaUltimaMedicionStr(): string {
    const ult = this.ultimaMedicionObj;
    if (!ult) return 'Sin mediciones';
    if (ult.fechaMedicion) {
      return new Date(ult.fechaMedicion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    if (ult.createdAt) {
      return new Date(ult.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return '';
  }

  get dynamicSvgPoints(): string {
    const reports = this.progressReports();
    if (reports.length === 0) return '50,110 140,95 240,75 330,65';
    if (reports.length === 1) return '50,80 350,80';

    const minImc = Math.min(...reports.map(r => r.imc ? parseFloat(r.imc) : 20)) - 1;
    const maxImc = Math.max(...reports.map(r => r.imc ? parseFloat(r.imc) : 25)) + 1;
    const range = maxImc - minImc || 1;

    const width = 300;
    const startX = 50;
    const stepX = width / (reports.length - 1);

    return reports.map((r, idx) => {
      const imcVal = r.imc ? parseFloat(r.imc) : 22;
      const x = startX + (idx * stepX);
      const y = 130 - (((imcVal - minImc) / range) * 100);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  get dynamicSvgCircles(): { cx: number; cy: number; imc: string; fecha: string }[] {
    const reports = this.progressReports();
    if (reports.length === 0) return [];
    const minImc = Math.min(...reports.map(r => r.imc ? parseFloat(r.imc) : 20)) - 1;
    const maxImc = Math.max(...reports.map(r => r.imc ? parseFloat(r.imc) : 25)) + 1;
    const range = maxImc - minImc || 1;

    const width = 300;
    const startX = 50;
    const stepX = reports.length > 1 ? width / (reports.length - 1) : 0;

    return reports.map((r, idx) => {
      const imcVal = r.imc ? parseFloat(r.imc) : 22;
      const x = reports.length === 1 ? 200 : startX + (idx * stepX);
      const y = 130 - (((imcVal - minImc) / range) * 100);
      const fecha = r.fechaMedicion ? new Date(r.fechaMedicion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
      return {
        cx: parseFloat(x.toFixed(1)),
        cy: parseFloat(y.toFixed(1)),
        imc: r.imc || '0',
        fecha
      };
    });
  }

  openBmiModal() {
    const ult = this.ultimaMedicionObj;
    const data = this.profileData();

    const peso = ult?.peso ?? (data?.peso ? parseFloat(data.peso) : null);

    let estatura: number | null = null;
    if (ult?.altura) {
      const parsed = parseFloat(ult.altura);
      estatura = parsed > 3 ? parsed : parseFloat((parsed * 100).toFixed(1));
    } else if (data?.estatura) {
      const parsed = parseFloat(data.estatura);
      estatura = parsed > 3 ? parsed : parseFloat((parsed * 100).toFixed(1));
    }

    let fecha = '';
    if (ult?.fechaMedicion) {
      fecha = ult.fechaMedicion.includes('T') ? ult.fechaMedicion.split('T')[0] : ult.fechaMedicion;
    } else {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      fecha = `${year}-${month}-${day}`;
    }

    this.bmiForm.patchValue({
      peso: peso,
      estatura: estatura,
      cintura: ult?.cintura ?? null,
      pecho: ult?.pecho ?? null,
      brazo: ult?.brazo ?? null,
      pierna: ult?.pierna ?? null,
      fechaMedicion: fecha
    });

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

    const val = this.bmiForm.value;
    const peso = val.peso;
    const estatura = val.estatura;

    if (!peso || !estatura || peso <= 0 || estatura <= 0) {
      this.alertService.error('El peso y la estatura deben ser números mayores a 0.');
      return;
    }

    const payload = {
      peso: peso,
      altura: estatura,
      cintura: val.cintura ? val.cintura : null,
      pecho: val.pecho ? val.pecho : null,
      brazo: val.brazo ? val.brazo : null,
      pierna: val.pierna ? val.pierna : null,
      fechaMedicion: val.fechaMedicion ? val.fechaMedicion : null
    };

    this.progressService.create(payload).subscribe({
      next: (res) => {
        this.fetchProfile();
        this.loadProgressHistory();
        this.alertService.success(`¡Mediciones actualizadas con éxito! IMC calculado: ${res.imc}`);
        this.closeBmiModal();
      },
      error: (err) => {
        this.alertService.error('Error al guardar medición: ' + (err.error?.message || err.message || err.error));
      }
    });
  }

  loadImcHistory() {
    this.loadProgressHistory();
  }

  loadProgressHistory() {
    this.progressService.getHistory().subscribe({
      next: (reports) => {
        this.progressReports.set(reports);
        const mapped: ImcRecord[] = reports.map(r => ({
          id: r.idProgreso.toString(),
          fecha: r.fechaMedicion ? new Date(r.fechaMedicion).toLocaleDateString('es-ES') : (r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-ES') : ''),
          pesoKg: r.peso,
          estaturaM: r.altura ? parseFloat(r.altura) : 0,
          imc: r.imc ? parseFloat(r.imc) : 0
        }));
        this.imcRecords.set(mapped);
        this.fetchGoals();
      },
      error: (err) => {
        console.error('Error al cargar historial de mediciones', err);
      }
    });
  }

  fetchGoals() {
    this.goalService.getGoals().subscribe({
      next: (goals) => {
        this.userGoals.set(goals);
      },
      error: (err) => {
        console.error('Error al cargar objetivos', err);
      }
    });
  }

  fetchGoalTypes() {
    this.goalService.getGoalTypes().subscribe({
      next: (types) => {
        this.availableGoalTypes.set(types);
      },
      error: (err) => {
        console.error('Error al cargar tipos de objetivos', err);
      }
    });
  }

  openNewGoalModal() {
    this.fetchGoalTypes();
    this.goalForm.reset();
    this.showNewGoalModal.set(true);
  }

  closeNewGoalModal() {
    this.showNewGoalModal.set(false);
  }

  get selectedGoalTypeUnit(): string {
    const selectedId = this.goalForm.value.idTipoObjetivo;
    if (!selectedId) return '';
    const gt = this.availableGoalTypes().find(t => t.idTipoObjetivo === Number(selectedId));
    return gt ? gt.unidad : '';
  }

  createGoal() {
    if (this.goalForm.invalid) {
      this.alertService.error('Completa los campos requeridos del objetivo.');
      return;
    }

    const { idTipoObjetivo, valorMeta, fechaLimite, descripcion } = this.goalForm.value;
    if (!idTipoObjetivo || !valorMeta || valorMeta <= 0) {
      this.alertService.error('Selecciona un tipo de objetivo y una meta mayor a 0.');
      return;
    }

    const payload = {
      idTipoObjetivo: Number(idTipoObjetivo),
      valorMeta: Number(valorMeta),
      fechaLimite: fechaLimite ? fechaLimite : null,
      descripcion: descripcion ? descripcion : null
    };

    this.goalService.createGoal(payload).subscribe({
      next: (res) => {
        this.alertService.success('¡Objetivo creado con éxito!');
        this.fetchGoals();
        this.closeNewGoalModal();
      },
      error: (err) => {
        this.alertService.error('Error al crear objetivo: ' + (err.error?.message || err.message || err.error));
      }
    });
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

  // Payment Checkout Modal State
  showPaymentCheckoutModal = signal<boolean>(false);
  selectedPaymentMethod = signal<'PSE' | 'TARJETA'>('PSE');
  selectedBank = signal<string>('Bancolombia');
  selectedPersonType = signal<'NATURAL' | 'JURIDICA'>('NATURAL');
  cardHolder = signal<string>('');
  cardNumber = signal<string>('');
  cardExp = signal<string>('');
  cardCvv = signal<string>('');
  isProcessingPayment = signal<boolean>(false);
  targetCheckoutPlan = signal<Membership | null>(null);
  checkoutAmount = signal<number>(0);
  isUpgradeFlow = signal<boolean>(false);

  buyPlan(id: number) {
    const plan = this.availablePlans().find(p => p.idMembresia === id);
    if (!plan) return;

    const activeMem = this.getActiveMembership();
    this.targetCheckoutPlan.set(plan);

    if (activeMem && activeMem.idMembresia) {
      // User has active membership: calculate surplus via Backend API
      this.isUpgradeFlow.set(true);
      this.membershipService.calculateUpgrade(plan.idMembresia).subscribe({
        next: (calc) => {
          this.upgradeCalc.set(calc);
          this.checkoutAmount.set(calc.excedenteAPagar);
          this.showPaymentCheckoutModal.set(true);
        },
        error: (err) => {
          this.alertService.error('No se pudo calcular el valor del cambio de plan: ' + (err.error?.message || err.message || err.error));
        }
      });
    } else {
      // First-time purchase
      this.isUpgradeFlow.set(false);
      this.upgradeCalc.set(null);
      this.checkoutAmount.set(plan.precio);
      this.showPaymentCheckoutModal.set(true);
    }
  }

  cancelPaymentCheckout() {
    this.showPaymentCheckoutModal.set(false);
    this.alertService.info('Proceso de pago cancelado. Tu membresía no ha sido modificada.');
  }

  submitPaymentCheckout() {
    const plan = this.targetCheckoutPlan();
    if (!plan) return;

    if (this.selectedPaymentMethod() === 'TARJETA' && !this.cardHolder()) {
      this.alertService.error('Por favor ingresa el nombre del titular de la tarjeta.');
      return;
    }

    this.isProcessingPayment.set(true);

    const req = {
      newPlanId: plan.idMembresia,
      paymentMethod: this.selectedPaymentMethod(),
      bankName: this.selectedPaymentMethod() === 'PSE' ? this.selectedBank() : undefined,
      personType: this.selectedPaymentMethod() === 'PSE' ? this.selectedPersonType() : undefined,
      cardHolder: this.selectedPaymentMethod() === 'TARJETA' ? this.cardHolder() : undefined,
      cardLast4: this.selectedPaymentMethod() === 'TARJETA' ? (this.cardNumber().replace(/\s/g, '').slice(-4) || '4242') : undefined,
      referenceId: `LEVELUP-2026-${Math.floor(100000 + Math.random() * 900000)}`
    };

    this.membershipService.processPayment(req).subscribe({
      next: (res) => {
        this.isProcessingPayment.set(false);
        this.showPaymentCheckoutModal.set(false);
        this.fetchProfile();

        this.lastReceipt.set({
          idTransaccion: res.referenceId,
          fecha: new Date(),
          nombreCliente: (this.profileData()?.nombre || '') + ' ' + (this.profileData()?.apellidos || ''),
          planNombre: res.planName,
          total: res.amountPaid,
          metodoPago: res.paymentMethod + (res.bankName ? ' (' + res.bankName + ')' : ''),
          vigencia: 'Válido hasta ' + res.expiresAt
        });

        this.showReceiptModal.set(true);
        this.alertService.success(res.isUpgrade ? '✓ Cambio de plan realizado con éxito' : '✓ Pago realizado correctamente');
        this.setSection('membresia');
      },
      error: (err) => {
        this.isProcessingPayment.set(false);
        this.alertService.error('El pago no pudo ser procesado. Tu membresía no ha sido modificada. Puedes intentar nuevamente con otro método de pago.');
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
    const height = canvas.parentElement?.clientHeight || canvas.clientHeight || 550;

    // ============================================================
    // 1. ESCENA
    // ============================================================
    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0x090c12);

    this.threeCamera = new THREE.PerspectiveCamera(
      38,
      width / height,
      0.1,
      1000
    );

    this.threeCamera.position.set(0, 0.15, 17.2);

    // ============================================================
    // 2. RENDERER
    // ============================================================
    this.threeRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });

    this.threeRenderer.setSize(width, height);
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.threeRenderer.shadowMap.enabled = true;
    this.threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ============================================================
    // 3. ILUMINACIÓN DE ESTUDIO
    // ============================================================
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.threeScene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 10, 10);
    this.threeScene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaab4c4, 1.0);
    fillLight.position.set(-7, 7, 8);
    this.threeScene.add(fillLight);

    const rimLightCrimson = new THREE.DirectionalLight(0xdc143c, 1.8);
    rimLightCrimson.position.set(-7, 3, -8);
    this.threeScene.add(rimLightCrimson);

    const rimLightGold = new THREE.PointLight(0xffd700, 0.7, 18);
    rimLightGold.position.set(5, 1, -5);
    this.threeScene.add(rimLightGold);

    // ============================================================
    // 4. GRUPO PRINCIPAL DEL CUERPO
    // ============================================================
    this.humanModelGroup = new THREE.Group();
    this.muscleMeshes = [];

    // Material negro metálico brillante, similar al maniquí de referencia.
    const createMannequinMaterial = (color = 0x171a20) => {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.16,
        metalness: 0.78,
        emissive: 0x000000
      });
    };

    const bodyBaseMat = createMannequinMaterial(0x15181e);
    const muscleBaseColor = 0x1b2028;

    // ============================================================
    // HELPERS PARA LA SILUETA BASE
    // ============================================================
    const addBodyPart = (
      geometry: THREE.BufferGeometry,
      position: [number, number, number],
      scale: [number, number, number] = [1, 1, 1],
      rotation: [number, number, number] = [0, 0, 0]
    ) => {
      const mesh = new THREE.Mesh(geometry, bodyBaseMat);
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      mesh.rotation.set(...rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.humanModelGroup?.add(mesh);
      return mesh;
    };

    // ============================================================
    // 5. CABEZA
    // ============================================================
    addBodyPart(
      new THREE.SphereGeometry(0.82, 48, 48),
      [0, 5.65, 0],
      [0.78, 1.12, 0.82]
    );

    // ============================================================
    // 6. CUELLO
    // ============================================================
    addBodyPart(
      new THREE.CapsuleGeometry(0.40, 0.48, 12, 32),
      [0, 4.82, 0],
      [1, 1, 0.9]
    );

    // ============================================================
    // 7. TORSO ATLÉTICO
    // ============================================================
    // Parte alta del torso: más ancha para formar la V de hombros.
    addBodyPart(
      new THREE.SphereGeometry(1, 48, 48),
      [0, 3.75, 0],
      [1.65, 1.25, 0.72]
    );

    // Torso central.
    addBodyPart(
      new THREE.CapsuleGeometry(0.95, 2.15, 12, 40),
      [0, 3.0, 0],
      [1.15, 1.0, 0.72]
    );

    // Cintura estrecha.
    addBodyPart(
      new THREE.SphereGeometry(1, 48, 48),
      [0, 1.85, 0],
      [0.82, 0.85, 0.63]
    );

    // Pelvis / cadera.
    addBodyPart(
      new THREE.SphereGeometry(1, 48, 48),
      [0, 0.95, 0],
      [1.05, 0.72, 0.70]
    );

    // ============================================================
    // 8. HOMBROS
    // ============================================================
    const shoulderGeometry = new THREE.SphereGeometry(0.65, 40, 40);

    addBodyPart(
      shoulderGeometry,
      [-1.38, 3.72, 0],
      [1.15, 1.0, 0.9]
    );

    addBodyPart(
      shoulderGeometry,
      [1.38, 3.72, 0],
      [1.15, 1.0, 0.9]
    );

    // ============================================================
    // 9. BRAZOS SUPERIORES
    // ============================================================
    const upperArmGeometry = new THREE.CapsuleGeometry(0.40, 1.25, 12, 32);

    addBodyPart(
      upperArmGeometry,
      [-1.65, 2.65, 0],
      [1.12, 1.05, 0.95],
      [0, 0, -0.04]
    );

    addBodyPart(
      upperArmGeometry,
      [1.65, 2.65, 0],
      [1.12, 1.05, 0.95],
      [0, 0, 0.04]
    );

    // ============================================================
    // 10. CODOS
    // ============================================================
    const elbowGeometry = new THREE.SphereGeometry(0.38, 32, 32);

    addBodyPart(
      elbowGeometry,
      [-1.70, 1.75, 0],
      [1, 1.1, 0.9]
    );

    addBodyPart(
      elbowGeometry,
      [1.70, 1.75, 0],
      [1, 1.1, 0.9]
    );

    // ============================================================
    // 11. ANTEBRAZOS
    // ============================================================
    const forearmGeometry = new THREE.CapsuleGeometry(0.31, 1.30, 12, 32);

    addBodyPart(
      forearmGeometry,
      [-1.70, 0.95, 0.02],
      [1.08, 1.05, 0.92],
      [0, 0, -0.03]
    );

    addBodyPart(
      forearmGeometry,
      [1.70, 0.95, 0.02],
      [1.08, 1.05, 0.92],
      [0, 0, 0.03]
    );

    // ============================================================
    // 12. MANOS
    // ============================================================
    const handGeometry = new THREE.SphereGeometry(0.34, 32, 32);

    addBodyPart(
      handGeometry,
      [-1.70, 0.05, 0.02],
      [0.75, 1.15, 0.58]
    );

    addBodyPart(
      handGeometry,
      [1.70, 0.05, 0.02],
      [0.75, 1.15, 0.58]
    );

    // ============================================================
    // 13. GLÚTEOS / TRANSICIÓN DE CADERA
    // ============================================================
    const gluteBaseGeometry = new THREE.SphereGeometry(0.72, 40, 40);

    addBodyPart(
      gluteBaseGeometry,
      [-0.52, 0.65, -0.30],
      [1.05, 1.0, 0.75]
    );

    addBodyPart(
      gluteBaseGeometry,
      [0.52, 0.65, -0.30],
      [1.05, 1.0, 0.75]
    );

    // ============================================================
    // 14. MUSLOS
    // ============================================================
    const thighGeometry = new THREE.CapsuleGeometry(0.56, 1.85, 12, 36);

    addBodyPart(
      thighGeometry,
      [-0.64, -0.55, 0],
      [1.10, 1.10, 0.92]
    );

    addBodyPart(
      thighGeometry,
      [0.64, -0.55, 0],
      [1.10, 1.10, 0.92]
    );

    // ============================================================
    // 15. RODILLAS
    // ============================================================
    const kneeGeometry = new THREE.SphereGeometry(0.50, 36, 36);

    addBodyPart(
      kneeGeometry,
      [-0.64, -1.75, 0.04],
      [0.95, 0.85, 0.82]
    );

    addBodyPart(
      kneeGeometry,
      [0.64, -1.75, 0.04],
      [0.95, 0.85, 0.82]
    );

    // ============================================================
    // 16. PANTORRILLAS
    // ============================================================
    const calfGeometry = new THREE.CapsuleGeometry(0.42, 1.65, 12, 32);

    addBodyPart(
      calfGeometry,
      [-0.64, -3.15, 0],
      [1.0, 1.08, 0.90]
    );

    addBodyPart(
      calfGeometry,
      [0.64, -3.15, 0],
      [1.0, 1.08, 0.90]
    );

    // ============================================================
    // 17. TOBILLOS
    // ============================================================
    const ankleGeometry = new THREE.SphereGeometry(0.28, 28, 28);

    addBodyPart(
      ankleGeometry,
      [-0.64, -4.15, 0],
      [1, 1.2, 0.9]
    );

    addBodyPart(
      ankleGeometry,
      [0.64, -4.15, 0],
      [1, 1.2, 0.9]
    );

    // ============================================================
    // 18. PIES
    // ============================================================
    const footGeometry = new THREE.SphereGeometry(0.48, 36, 36);

    addBodyPart(
      footGeometry,
      [-0.64, -4.55, 0.28],
      [0.95, 0.55, 1.65]
    );

    addBodyPart(
      footGeometry,
      [0.64, -4.55, 0.28],
      [0.95, 0.55, 1.65]
    );

    // ============================================================
    // 19. MÚSCULOS SELECCIONABLES
    // ============================================================
    const createMuscleMesh = (
      geometry: THREE.BufferGeometry,
      muscleId: string,
      position: [number, number, number],
      scale: [number, number, number] = [1, 1, 1],
      rotation: [number, number, number] = [0, 0, 0]
    ) => {
      const mat = createMannequinMaterial(muscleBaseColor);
      const mesh = new THREE.Mesh(geometry, mat);

      mesh.position.set(...position);
      mesh.scale.set(...scale);
      mesh.rotation.set(...rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      mesh.userData = {
        muscleId,
        ...(this.musclesDatabase[muscleId] || {})
      };

      this.humanModelGroup?.add(mesh);
      this.muscleMeshes.push(mesh);

      return mesh;
    };

    // ------------------------------------------------------------
    // TRAPECIO
    // ------------------------------------------------------------
    createMuscleMesh(
      new THREE.ConeGeometry(1.35, 1.0, 48),
      'trapecio',
      [0, 4.15, -0.02],
      [1.2, 1, 0.65]
    );

    // ------------------------------------------------------------
    // PECTORALES
    // ------------------------------------------------------------
    const chestGeometry = new THREE.SphereGeometry(0.70, 40, 40);

    createMuscleMesh(
      chestGeometry,
      'pectoral',
      [-0.55, 3.48, 0.52],
      [1.30, 0.78, 0.55],
      [0, 0, -0.08]
    );

    createMuscleMesh(
      chestGeometry,
      'pectoral',
      [0.55, 3.48, 0.52],
      [1.30, 0.78, 0.55],
      [0, 0, 0.08]
    );

    // ------------------------------------------------------------
    // DELTOIDES
    // ------------------------------------------------------------
    const deltoidGeometry = new THREE.SphereGeometry(0.58, 36, 36);

    createMuscleMesh(
      deltoidGeometry,
      'deltoides',
      [-1.38, 3.72, 0.22],
      [1.12, 1.0, 0.9]
    );

    createMuscleMesh(
      deltoidGeometry,
      'deltoides',
      [1.38, 3.72, 0.22],
      [1.12, 1.0, 0.9]
    );

    // ------------------------------------------------------------
    // BÍCEPS
    // ------------------------------------------------------------
    const bicepsGeometry = new THREE.CapsuleGeometry(0.34, 0.90, 10, 28);

    createMuscleMesh(
      bicepsGeometry,
      'biceps',
      [-1.66, 2.62, 0.30],
      [1.05, 1.05, 0.90]
    );

    createMuscleMesh(
      bicepsGeometry,
      'biceps',
      [1.66, 2.62, 0.30],
      [1.05, 1.05, 0.90]
    );

    // ------------------------------------------------------------
    // TRÍCEPS
    // ------------------------------------------------------------
    const tricepsGeometry = new THREE.CapsuleGeometry(0.34, 0.90, 10, 28);

    createMuscleMesh(
      tricepsGeometry,
      'triceps',
      [-1.66, 2.62, -0.28],
      [1.05, 1.05, 0.88]
    );

    createMuscleMesh(
      tricepsGeometry,
      'triceps',
      [1.66, 2.62, -0.28],
      [1.05, 1.05, 0.88]
    );

    // ------------------------------------------------------------
    // ABDOMINALES
    // ------------------------------------------------------------
    createMuscleMesh(
      new THREE.SphereGeometry(0.82, 40, 40),
      'abs',
      [0, 2.28, 0.54],
      [0.78, 1.20, 0.42]
    );

    // ------------------------------------------------------------
    // DORSAL
    // ------------------------------------------------------------
    createMuscleMesh(
      new THREE.SphereGeometry(1.05, 40, 40),
      'dorsal',
      [0, 3.10, -0.48],
      [1.25, 1.0, 0.34]
    );

    // ------------------------------------------------------------
    // LUMBARES
    // ------------------------------------------------------------
    createMuscleMesh(
      new THREE.SphereGeometry(0.68, 36, 36),
      'lumbares',
      [0, 1.55, -0.45],
      [1.0, 0.72, 0.38]
    );

    // ------------------------------------------------------------
    // GLÚTEOS
    // ------------------------------------------------------------
    const gluteGeometry = new THREE.SphereGeometry(0.72, 40, 40);

    createMuscleMesh(
      gluteGeometry,
      'gluteos',
      [-0.55, 0.55, -0.55],
      [1.05, 1.0, 0.70]
    );

    createMuscleMesh(
      gluteGeometry,
      'gluteos',
      [0.55, 0.55, -0.55],
      [1.05, 1.0, 0.70]
    );

    // ------------------------------------------------------------
    // CUÁDRICEPS
    // ------------------------------------------------------------
    const quadGeometry = new THREE.CapsuleGeometry(0.57, 1.75, 10, 32);

    createMuscleMesh(
      quadGeometry,
      'cuadriceps',
      [-0.64, -0.62, 0.36],
      [1.05, 1.05, 0.72]
    );

    createMuscleMesh(
      quadGeometry,
      'cuadriceps',
      [0.64, -0.62, 0.36],
      [1.05, 1.05, 0.72]
    );

    // ------------------------------------------------------------
    // ISQUIOTIBIALES
    // ------------------------------------------------------------
    const hamstringGeometry = new THREE.CapsuleGeometry(0.52, 1.75, 10, 32);

    createMuscleMesh(
      hamstringGeometry,
      'isquiotibiales',
      [-0.64, -0.62, -0.35],
      [1.0, 1.05, 0.72]
    );

    createMuscleMesh(
      hamstringGeometry,
      'isquiotibiales',
      [0.64, -0.62, -0.35],
      [1.0, 1.05, 0.72]
    );

    // ------------------------------------------------------------
    // GEMELOS
    // ------------------------------------------------------------
    const calfMuscleGeometry = new THREE.CapsuleGeometry(0.40, 1.40, 10, 28);

    createMuscleMesh(
      calfMuscleGeometry,
      'gemelos',
      [-0.64, -3.12, -0.18],
      [1.0, 1.05, 0.75]
    );

    createMuscleMesh(
      calfMuscleGeometry,
      'gemelos',
      [0.64, -3.12, -0.18],
      [1.0, 1.05, 0.75]
    );

    // ============================================================
    // 20. POSICIÓN FINAL DEL MODELO
    // ============================================================
    this.humanModelGroup.position.set(0, -0.35, 0);
    this.humanModelGroup.scale.set(1, 1, 1);
    this.threeScene.add(this.humanModelGroup);

    // ============================================================
    // 21. INTERACCIÓN CON MOUSE / RAYCASTING
    // ============================================================
    const domElement = this.threeRenderer.domElement;

    const onPointerMove = (e: MouseEvent) => {
      const rect = domElement.getBoundingClientRect();

      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      // Rotación manual.
      if (this.isDragging3D && this.humanModelGroup) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.humanModelGroup.rotation.y += deltaX * 0.01;
        this.humanModelGroup.rotation.x += deltaY * 0.005;
        this.humanModelGroup.rotation.x = Math.max(
          -0.4,
          Math.min(0.4, this.humanModelGroup.rotation.x)
        );
      }

      this.previousMousePosition = {
        x: e.clientX,
        y: e.clientY
      };

      // Hover de músculos.
      if (this.threeCamera) {
        this.raycaster.setFromCamera(this.mouse, this.threeCamera);

        const intersects = this.raycaster.intersectObjects(
          this.muscleMeshes,
          false
        );

        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;

          domElement.style.cursor = 'pointer';

          this.hoveredMuscleName.set(
            hitMesh.userData['nombre'] || 'Músculo'
          );

          if (this.hoveredMesh !== hitMesh) {
            this.resetHoveredMesh();
            this.hoveredMesh = hitMesh;

            const mat = hitMesh.material as THREE.MeshStandardMaterial;
            mat.emissive.setHex(0xdc143c);
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
      this.previousMousePosition = {
        x: e.clientX,
        y: e.clientY
      };
      domElement.style.cursor = 'grabbing';
    };

    const onPointerUp = (e: MouseEvent) => {
      this.isDragging3D = false;
      domElement.style.cursor = 'grab';

      const rect = domElement.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const clickY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (this.threeCamera) {
        this.raycaster.setFromCamera(
          new THREE.Vector2(clickX, clickY),
          this.threeCamera
        );

        const intersects = this.raycaster.intersectObjects(
          this.muscleMeshes,
          false
        );

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
        this.threeCamera.position.z = Math.max(
          8,
          Math.min(24, this.threeCamera.position.z)
        );
      }
    };

    domElement.style.cursor = 'grab';
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('pointerleave', () => {
      this.isDragging3D = false;
      domElement.style.cursor = 'grab';
    });
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // ============================================================
    // 22. ANIMACIÓN
    // ============================================================
    const animate = () => {
      this.threeAnimationId = requestAnimationFrame(animate);

      if (!this.isDragging3D && this.humanModelGroup) {
        this.humanModelGroup.rotation.y += 0.002;
      }

      if (this.threeRenderer && this.threeScene && this.threeCamera) {
        this.threeRenderer.render(
          this.threeScene,
          this.threeCamera
        );
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
      this.threeCamera.position.set(0, 0.2, 18.5);
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