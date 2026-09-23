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
import { PaymentService, PaymentStatusResponse } from '../../services/payment.service';
import { SIMULATED_BANK_CREDENTIALS, getBankConfig, BankConfig, SIMULATED_CARDS_CONFIG, SimulatedCardConfig, detectCardBrand } from '../../config/simulated-banks.config';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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

export interface MuscleProportion {
  icono: 'body' | 'chart' | 'joint';
  texto: string;
}

export interface ExerciseDetail {
  nombre: string;
  enfoque: string;
  series?: string;
  repeticiones?: string;
  descanso?: string;
  nivel?: string;
  tempo?: string;
  tips?: string[];
  pasos?: string[];
  erroresComunes?: string[];
  imagenUrl?: string;
}

export interface MuscleInfo {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  proporciones: MuscleProportion[];
  ejerciciosDetalle: ExerciseDetail[];
  ejercicios: string[];
  anchor3D?: [number, number, number];
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
  private paymentService = inject(PaymentService);
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
  isLoading3DModel = signal<boolean>(true);
  pinScreenPos = signal<{ x: number; y: number; visible: boolean; label: string }>({
    x: 0,
    y: 0,
    visible: false,
    label: ''
  });
  private threeScene?: THREE.Scene;
  private threeCamera?: THREE.PerspectiveCamera;
  private threeRenderer?: THREE.WebGLRenderer;
  private threeAnimationId?: number;
  private muscleMeshes: THREE.Mesh[] = [];
  private bodyMeshes: THREE.Mesh[] = [];
  private meshMuscleVertexIndices = new Map<THREE.Mesh, Map<string, number[]>>();
  private muscleFilters: Record<string, (p: THREE.Vector3) => boolean> = {
    deltoides: (p) => p.y >= 2.85 && p.y <= 3.88 && Math.abs(p.x) >= 1.00 && Math.abs(p.x) <= 2.05,
    pectoral: (p) => p.y >= 2.25 && p.y <= 3.45 && Math.abs(p.x) <= 1.20 && p.z >= 0.05,
    abs: (p) => p.y >= 0.85 && p.y < 2.25 && Math.abs(p.x) <= 0.90 && p.z >= 0.08,
    biceps: (p) => p.y >= 1.65 && p.y <= 2.75 && Math.abs(p.x) >= 1.25 && Math.abs(p.x) <= 2.05 && p.z >= -0.40,
    triceps: (p) => p.y >= 1.65 && p.y <= 2.75 && Math.abs(p.x) >= 1.25 && Math.abs(p.x) <= 2.05 && p.z < -0.40,
    trapecio: (p) => p.y >= 3.70 && p.y <= 4.40 && Math.abs(p.x) <= 1.15 && p.z <= 0.15,
    dorsal: (p) => p.y >= 1.55 && p.y <= 2.95 && Math.abs(p.x) >= 0.35 && Math.abs(p.x) <= 1.35 && p.z <= -0.10,
    lumbares: (p) => p.y >= 0.75 && p.y < 1.55 && Math.abs(p.x) <= 0.70 && p.z <= -0.05,
    gluteos: (p) => p.y >= -0.05 && p.y < 0.75 && Math.abs(p.x) <= 0.90 && p.z <= -0.05,
    cuadriceps: (p) => p.y >= -2.00 && p.y < -0.05 && Math.abs(p.x) >= 0.15 && Math.abs(p.x) <= 1.15 && p.z >= -0.05,
    isquiotibiales: (p) => p.y >= -2.00 && p.y < -0.05 && Math.abs(p.x) >= 0.15 && Math.abs(p.x) <= 1.15 && p.z < -0.05,
    gemelos: (p) => p.y >= -3.55 && p.y < -2.00 && Math.abs(p.x) >= 0.15 && Math.abs(p.x) <= 1.05 && p.z <= 0.10
  };
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredMesh: THREE.Mesh | null = null;
  private hoveredMuscleId: string | null = null;
  private isDragging3D = false;
  private dragDistance3D = 0;
  private previousMousePosition = { x: 0, y: 0 };
  private humanModelGroup?: THREE.Group;

  // Recommended Exercise Detail Modal State (Anatomy 3D Explorer)
  showRecommendedExerciseModal = signal<boolean>(false);
  activeRecommendedExercise = signal<ExerciseDetail | null>(null);

  openRecommendedExerciseModal(ex: ExerciseDetail) {
    this.activeRecommendedExercise.set(ex);
    this.showRecommendedExerciseModal.set(true);
  }

  closeRecommendedExerciseModal() {
    this.showRecommendedExerciseModal.set(false);
    this.activeRecommendedExercise.set(null);
  }

  get displayedExercises(): ExerciseDetail[] {
    const m = this.selectedMuscle();
    if (m && m.ejerciciosDetalle && m.ejerciciosDetalle.length > 0) {
      return m.ejerciciosDetalle;
    }
    return this.musclesDatabase['deltoides'].ejerciciosDetalle;
  }

  get activeMuscleTitle(): string {
    const m = this.selectedMuscle();
    return m ? m.nombre : 'Deltoides';
  }

  // Muscle Database
  musclesDatabase: Record<string, MuscleInfo> = {
    deltoides: {
      id: 'deltoides',
      nombre: 'Deltoides',
      categoria: 'Hombro',
      descripcion: 'El deltoides es un músculo triangular que forma el contorno del hombro. Se encarga de la abducción del brazo y participa en la flexión y extensión del hombro.',
      anchor3D: [1.25, 3.32, -0.2],
      proporciones: [
        { icono: 'body', texto: 'Se encuentra en el hombro, cubre la articulación glenohumeral y da forma y redondez al brazo.' },
        { icono: 'chart', texto: 'Representa aproximadamente el 12-15% de la masa muscular del tren superior.' },
        { icono: 'joint', texto: 'Tiene tres cabezas: anterior (empuje vertical), media (amplitud lateral) y posterior (retracción).' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Press militar con barra',
          enfoque: 'Constructor masivo de fuerza para la porción anterior y clavicular',
          series: '4',
          repeticiones: '6 - 8',
          descanso: '90 - 120 seg',
          nivel: 'Intermedio - Avanzado',
          tempo: '3-0-1-0',
          tips: [
            'Contrae glúteos y abdomen para mantener la columna neutra durante el empuje.',
            'Baja la barra de forma controlada hasta la altura de la clavícula.',
            'Bloquea los codos arriba con la cabeza levemente proyectada hacia adelante.'
          ],
          pasos: [
            'Toma la barra a la anchura de hombros apoyada sobre el pecho alto.',
            'Empuja verticalmente en línea recta pasando cerca del rostro.',
            'Pausa un instante en la cima y desciende en 3 segundos resistiendo la carga.'
          ],
          erroresComunes: [
            'Arquear en exceso la zona lumbar para compensar falta de movilidad de hombro.',
            'Empujar la barra en diagonal hacia adelante en vez de hacia arriba.'
          ]
        },
        {
          nombre: 'Elevaciones laterales con mancuernas',
          enfoque: 'Aislamiento máximo de la cabeza lateral para máxima amplitud',
          series: '4',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Principiante - Intermedio',
          tempo: '2-1-1-1',
          tips: [
            'Lidera el movimiento con los codos, nunca con las muñecas.',
            'Mantén una leve inclinación de 10° hacia adelante en el torso.',
            'Pausa de 1 segundo en el punto de contracción horizontal.'
          ],
          pasos: [
            'Sostén las mancuernas a los lados con los codos ligeramente flexionados.',
            'Eleva los brazos hacia los laterales en el plano escapular hasta la altura de hombros.',
            'Baja lentamente sintiendo la tensión continua sin dejar caer el peso.'
          ],
          erroresComunes: [
            'Usar balanceo de cadera para iniciar el movimiento.',
            'Elevar las mancuernas por encima del nivel de los hombros activando el trapecio.'
          ]
        },
        {
          nombre: 'Pájaros para deltoides posterior',
          enfoque: 'Hipertrofia del deltoides posterior y equilibrio postural',
          series: '4',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Intermedio',
          tempo: '2-1-1-0',
          tips: [
            'Mantén el torso inclinado a 45° o paralelo al suelo.',
            'Abre los brazos como alas de ave sin retraer las escápulas primero.',
            'Siente el trabajo en la parte posterior del hombro.'
          ],
          pasos: [
            'Inclina la cadera manteniendo la espalda recta y cabeza alineada.',
            'Abre las mancuernas hacia los lados con ligera flexión de codos.',
            'Aprieta 1 segundo atrás y desciende de forma controlada.'
          ],
          erroresComunes: [
            'Juntar los omóplatos al inicio transfiriendo la carga a los romboides.',
            'Mover la espalda baja durante la fase concéntrica.'
          ]
        },
        {
          nombre: 'Press Arnold con mancuernas',
          enfoque: 'Reclutamiento tridimensional de las tres cabezas del deltoides',
          series: '3',
          repeticiones: '10 - 12',
          descanso: '75 seg',
          nivel: 'Intermedio',
          tempo: '3-0-1-0',
          tips: [
            'Inicia con palmas mirando hacia tu pecho.',
            'Gira suavemente los antebrazos mientras empujas hacia arriba.',
            'Termina con palmas hacia el frente en la posición final.'
          ],
          pasos: [
            'Siéntate con espalda recta sosteniendo las mancuernas a la altura de la barbilla.',
            'Abre y rota simultáneamente mientras empujas sobre la cabeza.',
            'Revierte la rotación en el descenso de forma fluida y controlada.'
          ],
          erroresComunes: [
            'Acelerar el descenso sin controlar la fase de rotación.',
            'Golpear las mancuernas entre sí en el punto más alto.'
          ]
        }
      ],
      ejercicios: ['Press militar con barra', 'Elevaciones laterales con mancuernas', 'Pájaros para deltoides posterior', 'Press Arnold']
    },
    pectoral: {
      id: 'pectoral',
      nombre: 'Pectoral mayor',
      categoria: 'Pecho',
      descripcion: 'Músculo principal de la pared torácica anterior. Su función primaria es la aducción, rotación interna y flexión horizontal del brazo.',
      anchor3D: [0.56, 3.0, 0.45],
      proporciones: [
        { icono: 'body', texto: 'Cubre la caja torácica superior y conecta la clavícula y el esternón con el húmero.' },
        { icono: 'chart', texto: 'Representa entre el 15-20% de la fuerza de empuje del tren superior.' },
        { icono: 'joint', texto: 'Consta de dos cabezas anatómicas: clavicular (superior) y esternocostal (inferior).' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Press de banca plano con barra',
          enfoque: 'Fuerza básica y masa total para la porción media e inferior',
          series: '4',
          repeticiones: '8 - 10',
          descanso: '90 - 120 seg',
          nivel: 'Intermedio',
          tempo: '3-1-1-0',
          tips: [
            'Retrae y deprime los omóplatos firmemente contra el banco.',
            'Pies bien apoyados en el suelo generando leg drive.',
            'Baja la barra al esternón medio controlando el trayecto.'
          ],
          pasos: [
            'Acuéstate con los ojos alineados debajo de la barra.',
            'Desengancha la barra y colócala sobre tu pecho con los codos a 45-70°.',
            'Desciende hasta tocar suavemente el pecho y empuja con potencia explosiva.'
          ],
          erroresComunes: [
            'Abrir los codos a 90° respecto al torso provocando pinzamiento del hombro.',
            'Rebotar la barra sobre el pecho en el punto de inversión.'
          ]
        },
        {
          nombre: 'Press inclinado con mancuernas',
          enfoque: 'Énfasis directo en el haz clavicular superior para un pecho lleno',
          series: '4',
          repeticiones: '10 - 12',
          descanso: '75 seg',
          nivel: 'Intermedio',
          tempo: '3-0-1-0',
          tips: [
            'Ajusta el banco entre 30° y 45° para evitar sobrecargar los hombros.',
            'Junta las mancuernas en la parte superior sin chocarlas.',
            'Mantén los codos debajo de las muñecas durante toda la serie.'
          ],
          pasos: [
            'Sube las mancuernas con las rodillas y estabilízalas arriba.',
            'Baja en 3 segundos sintiendo el estiramiento en la porción alta del pectoral.',
            'Empuja contrayendo activamente el pecho superior.'
          ],
          erroresComunes: [
            'Inclinar el banco a más de 45°, transfiriendo el trabajo al deltoides anterior.',
            'Bajar los codos excesivamente por debajo del plano del banco.'
          ]
        },
        {
          nombre: 'Aperturas en polea alta (Crossover)',
          enfoque: 'Aislamiento máximo en aducción y contracción continua',
          series: '3',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Intermedio',
          tempo: '2-1-1-1',
          tips: [
            'Mantén una ligera flexión constante en los codos (abrazo de oso).',
            'Cruza ligeramente las manos al final para mayor contracción esternal.',
            'Torso estable con un pie adelante para balance.'
          ],
          pasos: [
            'Colócate en el centro de las poleas con un paso al frente.',
            'Junta los brazos hacia abajo y adelante contrayendo el pecho.',
            'Abre controladamente hasta sentir estiramiento antes de volver.'
          ],
          erroresComunes: [
            'Convertir la apertura en un press flexionando y extendiendo los codos.',
            'Usar peso excesivo que curve los hombros hacia adelante.'
          ]
        },
        {
          nombre: 'Fondos en paralelas para pecho',
          enfoque: 'Densidad y potencia en la parte baja del pectoral',
          series: '3 - 4',
          repeticiones: '10 - 12',
          descanso: '90 seg',
          nivel: 'Avanzado',
          tempo: '3-0-1-0',
          tips: [
            'Inclina el torso 30° hacia adelante para priorizar el pecho sobre el tríceps.',
            'Codos ligeramente abiertos hacia afuera al descender.',
            'No desciendas más allá de los 90° de flexión de codo.'
          ],
          pasos: [
            'Súbete a las barras paralelas con brazos extendidos.',
            'Inclina el torso y flexiona codos descendiendo en 3 segundos.',
            'Empuja con el pecho hasta la posición inicial sin bloquear codos bruscamente.'
          ],
          erroresComunes: [
            'Mantener el torso totalmente vertical cargando el tríceps.',
            'Bajar descontroladamente estirando en exceso la cápsula articular.'
          ]
        }
      ],
      ejercicios: ['Press de banca plano con barra', 'Press inclinado con mancuernas', 'Aperturas en polea alta (Crossover)', 'Fondos en paralelas para pecho']
    },
    biceps: {
      id: 'biceps',
      nombre: 'Bíceps braquial',
      categoria: 'Brazo Anterior',
      descripcion: 'Músculo de dos cabezas ubicado en la región anterior del brazo. Es el flexor del codo más potente en posición de supinación.',
      anchor3D: [1.35, 2.05, -0.2],
      proporciones: [
        { icono: 'body', texto: 'Se ubica en la cara frontal del brazo conectando la escápula con el radio.' },
        { icono: 'chart', texto: 'Constituye aproximadamente el 35% de la masa muscular total del brazo.' },
        { icono: 'joint', texto: 'Posee dos cabezas: cabeza larga (pico del bíceps) y cabeza corta (grosor interno).' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Curl con barra Z de pie',
          enfoque: 'Desarrollo de fuerza general y sobrecarga progresiva',
          series: '4',
          repeticiones: '8 - 10',
          descanso: '75 seg',
          nivel: 'Principiante - Intermedio',
          tempo: '3-0-1-0',
          tips: [
            'Fija los codos pegados a los costados del torso en todo momento.',
            'Evita balancear la cadera para subir la barra.',
            'Aprieta los bíceps 1 segundo en la cima del movimiento.'
          ],
          pasos: [
            'Toma la barra Z con agarre en supinación a la anchura de hombros.',
            'Flexiona los codos subiendo la barra hasta la altura de los hombros.',
            'Desciende lentamente en 3 segundos hasta la extensión completa.'
          ],
          erroresComunes: [
            'Mover los codos hacia adelante adelantando el hombro anterior.',
            'Arquear la espalda lumbar al iniciar la subida.'
          ]
        },
        {
          nombre: 'Curl martillo con mancuernas',
          enfoque: 'Trabaja el braquial anterior y braquiorradial para mayor grosor de brazo',
          series: '4',
          repeticiones: '10 - 12',
          descanso: '60 seg',
          nivel: 'Principiante',
          tempo: '2-0-1-0',
          tips: [
            'Agarre neutro con las palmas mirándose fijamente entre sí.',
            'Movimiento estricto con el torso erguido.',
            'Excelente para salud articular de muñeca y codo.'
          ],
          pasos: [
            'Sostén mancuernas a los lados con palmas hacia el cuerpo.',
            'Sube de manera simultánea o alterna manteniendo el agarre neutro.',
            'Baja con control resistiendo la gravedad.'
          ],
          erroresComunes: [
            'Girar las muñecas perdiendo la posición neutra.',
            'Dejar caer el peso en la fase excéntrica.'
          ]
        },
        {
          nombre: 'Curl en banco Scott (Predicador)',
          enfoque: 'Aislamiento estricto sin compensación ni inercia del deltoides',
          series: '3',
          repeticiones: '10 - 12',
          descanso: '60 seg',
          nivel: 'Intermedio',
          tempo: '3-1-1-0',
          tips: [
            'Apoya completamente los brazos sobre la almohadilla inclinada.',
            'No extiendas el codo al 100% de forma brusca en la base para proteger el tendón.',
            'Mantén los hombros relajados y la espalda plana.'
          ],
          pasos: [
            'Siéntate y acomoda las axilas sobre el borde del banco.',
            'Flexiona los codos levantando la barra hacia la frente.',
            'Desciende con máxima concentración en 3 segundos.'
          ],
          erroresComunes: [
            'Despegar los codos de la almohadilla al levantar peso pesado.',
            'Bloquear los codos con fuerza abajo arriesgando lesión tendinosa.'
          ]
        },
        {
          nombre: 'Curl inclinado con mancuernas',
          enfoque: 'Máximo estiramiento de la cabeza larga en rango profundo',
          series: '3',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Intermedio',
          tempo: '3-1-1-0',
          tips: [
            'Banco reclinado a unos 60°.',
            'Deja que los brazos cuelguen rectos sintiendo el estiramiento en la cabeza larga.',
            'Supina las muñecas activamente a mitad del recorrido.'
          ],
          pasos: [
            'Acuéstate en el banco inclinado con los brazos extendidos.',
            'Sube las mancuernas girando las palmas hacia arriba.',
            'Baja sintiendo la tensión profunda en cada centímetro.'
          ],
          erroresComunes: [
            'Levantar la cabeza y hombros del respaldo para impulsarse.',
            'Usar un banco demasiado plano tensionando el manguito rotador.'
          ]
        }
      ],
      ejercicios: ['Curl con barra Z de pie', 'Curl martillo con mancuernas', 'Curl en banco Scott (Predicador)', 'Curl inclinado con mancuernas']
    },
    triceps: {
      id: 'triceps',
      nombre: 'Tríceps braquial',
      categoria: 'Brazo Posterior',
      descripcion: 'Músculo voluminoso de tres cabezas en la cara posterior del brazo, responsable exclusivo de la extensión del codo.',
      anchor3D: [1.50, 2.25, -0.65],
      proporciones: [
        { icono: 'body', texto: 'Ocupa toda la cara posterior del brazo desde la escápula hasta el olécranon.' },
        { icono: 'chart', texto: 'Representa más del 60% del volumen y perímetro total del brazo.' },
        { icono: 'joint', texto: 'Formado por cabeza lateral (herradura), medial y cabeza larga (densidad posterior).' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Extensiones en polea con cuerda',
          enfoque: 'Apertura final para activar intensamente la cabeza lateral',
          series: '4',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Principiante - Intermedio',
          tempo: '2-1-1-1',
          tips: [
            'Separa los extremos de la cuerda hacia los costados en el punto más bajo.',
            'Mantén los codos pegados a las costillas sin que se abran.',
            'Sostén 1 segundo la contracción completa antes de subir.'
          ],
          pasos: [
            'Sujeta la cuerda de la polea alta con torso ligeramente inclinado.',
            'Extiende los codos llevando la cuerda hacia las caderas.',
            'Abre las puntas y aprieta con fuerza los tríceps.'
          ],
          erroresComunes: [
            'Dejar que los codos se muevan hacia adelante y atrás durante las repeticiones.',
            'Usar el peso del cuerpo para empujar hacia abajo.'
          ]
        },
        {
          nombre: 'Press francés con barra Z',
          enfoque: 'Enfoque biomecánico en la cabeza larga en posición de estiramiento',
          series: '4',
          repeticiones: '10 - 12',
          descanso: '75 seg',
          nivel: 'Intermedio',
          tempo: '3-0-1-0',
          tips: [
            'Lleva los codos ligeramente inclinados hacia atrás (hacia la coronilla).',
            'No abras los codos hacia afuera durante el movimiento.',
            'Baja la barra de forma muy controlada hacia la parte superior de la cabeza.'
          ],
          pasos: [
            'Acuéstate en el banco sosteniendo la barra Z con brazos extendidos hacia arriba.',
            'Flexiona únicamente los codos bajando la barra detrás de la cabeza.',
            'Extiende con potencia los codos para volver al inicio.'
          ],
          erroresComunes: [
            'Abrir los codos en abducción provocando sobrecarga en los tendones del codo.',
            'Mover los hombros convirtiendo el ejercicio en un pullover.'
          ]
        },
        {
          nombre: 'Fondos en barras paralelas',
          enfoque: 'Gran sobrecarga compuesta para tríceps y fuerza de empuje',
          series: '4',
          repeticiones: '8 - 10',
          descanso: '90 seg',
          nivel: 'Avanzado',
          tempo: '3-0-1-0',
          tips: [
            'Mantén el torso lo más vertical posible para enfocar el esfuerzo en el tríceps.',
            'Codos pegados al cuerpo durante el recorrido.',
            'Baja hasta que el codo forme aproximadamente un ángulo de 90°.'
          ],
          pasos: [
            'Sostente en las barras con brazos estirados y mirada al frente.',
            'Desciende con el cuerpo erguido flexionando codos en 3 segundos.',
            'Empuja hacia abajo con fuerza hasta bloquear los brazos.'
          ],
          erroresComunes: [
            'Inclinarse hacia adelante transfiriendo el trabajo al pectoral.',
            'Descender por debajo del rango seguro causando dolor en hombro.'
          ]
        },
        {
          nombre: 'Patada de tríceps en polea',
          enfoque: 'Pico de contracción isolateral sin balanceo',
          series: '3',
          repeticiones: '15',
          descanso: '45 seg',
          nivel: 'Intermedio',
          tempo: '2-1-1-1',
          tips: [
            'Brazo superior paralelo al suelo durante toda la ejecución.',
            'Contrae el tríceps en máxima extensión con pausa de 1 segundo.',
            'La polea mantiene tensión continua a diferencia de las mancuernas.'
          ],
          pasos: [
            'Inclina el torso con un pie adelante y codo elevado.',
            'Extiende el antebrazo hacia atrás hasta que el brazo quede recto.',
            'Regresa en 2 segundos sin mover el codo de su posición fija.'
          ],
          erroresComunes: [
            'Bajar el codo al inicio de cada repetición perdiendo la palanca.',
            'Hacer movimientos rápidos y espasmódicos sin control.'
          ]
        }
      ],
      ejercicios: ['Extensiones en polea con cuerda', 'Press francés con barra Z', 'Fondos en barras paralelas', 'Patada de tríceps en polea']
    },
    abs: {
      id: 'abs',
      nombre: 'Abdominales y Core',
      categoria: 'Zona Media',
      descripcion: 'Conjunto muscular que estabiliza el raquis, transmite fuerzas entre tren inferior y superior y protege las vísceras.',
      anchor3D: [0.0, 1.49, 0.43],
      proporciones: [
        { icono: 'body', texto: 'Envuelve la zona central del tronco uniendo la caja torácica con la pelvis.' },
        { icono: 'chart', texto: 'Eje biomecánico responsable del 100% de la estabilidad lumbo-pélvica.' },
        { icono: 'joint', texto: 'Integrado por recto abdominal, oblicuos internos/externos y transverso profundo.' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Crunch en polea alta arrodillado',
          enfoque: 'Flexión espinal con carga progresiva para hipertrofia de los bloques abdominales',
          series: '4',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Intermedio',
          tempo: '2-1-1-1',
          tips: [
            'Dobla la columna vertebral (curvando la espalda) en lugar de solo inclinar la cadera.',
            'Lleva los codos hacia las rodillas mientras exhalas todo el aire.',
            'Aprieta intensamente 1 segundo abajo sintiendo el recto abdominal.'
          ],
          pasos: [
            'Arrodíllate frente a la polea con cuerda apoyada en la cabeza.',
            'Flexiona el tronco enrollando la caja torácica hacia la pelvis.',
            'Regresa estirando el abdomen sin levantarte de las rodillas.'
          ],
          erroresComunes: [
            'Mover las caderas hacia atrás como si fuera una sentadilla.',
            'Tirar con los brazos en lugar de flexionar con los abdominales.'
          ]
        },
        {
          nombre: 'Elevaciones de piernas colgado',
          enfoque: 'Activación intensa de la porción infraumbilical y flexores de cadera',
          series: '4',
          repeticiones: '10 - 12',
          descanso: '60 seg',
          nivel: 'Avanzado',
          tempo: '2-0-1-0',
          tips: [
            'No solo subas las piernas: flexiona la pelvis hacia el pecho al final.',
            'Evita usar balanceo pendular del cuerpo para tomar impulso.',
            'Si es muy difícil, inicia con rodillas flexionadas al pecho.'
          ],
          pasos: [
            'Cuélgate de una barra con agarre firme y core tenso.',
            'Eleva las piernas rectas o flexionadas curvando la pelvis hacia arriba.',
            'Baja lentamente controlando el frenado excéntrico.'
          ],
          erroresComunes: [
            'Hacer balanceo usando la inercia del cuerpo entero.',
            'No bascular la pelvis, activando únicamente el psoas ilíaco.'
          ]
        },
        {
          nombre: 'Rueda abdominal (Ab Wheel)',
          enfoque: 'Anti-extensión extrema y máxima tensión en todo el núcleo profundo',
          series: '3',
          repeticiones: '8 - 12',
          descanso: '75 seg',
          nivel: 'Avanzado',
          tempo: '3-1-1-0',
          tips: [
            'Inicia con la pelvis en retroversión y glúteos contraídos al 100%.',
            'No dejes que la zona lumbar se arquee o hunda en ningún momento.',
            'Rueda hacia adelante solo hasta donde puedas mantener el control espinal.'
          ],
          pasos: [
            'Arrodíllate con la rueda apoyada frente a tus rodillas.',
            'Rueda lentamente hacia el frente estirando el cuerpo.',
            'Tira desde el abdomen para volver a la posición de partida.'
          ],
          erroresComunes: [
            'Dejar caer la cadera arqueando la espalda baja causando dolor lumbar.',
            'Doblar los codos en vez de mantener los brazos firmes.'
          ]
        },
        {
          nombre: 'Plancha isométrica con carga',
          enfoque: 'Estabilidad y resistencia postural isométrica antirrotatoria',
          series: '3',
          repeticiones: '45 - 60 seg',
          descanso: '60 seg',
          nivel: 'Intermedio',
          tempo: 'Isométrico',
          tips: [
            'Línea recta perfecta desde la cabeza hasta los talones.',
            'Empuja el suelo con los antebrazos separando las escápulas.',
            'Respira de forma controlada manteniendo la pared abdominal activa.'
          ],
          pasos: [
            'Coloca los antebrazos y puntas de pies en el suelo.',
            'Activa cuádriceps, glúteos y abdomen como si fueras una tabla de madera.',
            'Sostén el tiempo objetivo con tensión inquebrantable.'
          ],
          erroresComunes: [
            'Dejar que la pelvis caiga hacia el suelo por fatiga.',
            'Subir la cadera en forma de pirámide relajando el core.'
          ]
        }
      ],
      ejercicios: ['Crunch en polea alta arrodillado', 'Elevaciones de piernas colgado', 'Rueda abdominal (Ab Wheel)', 'Plancha isométrica con carga']
    },
    dorsal: {
      id: 'dorsal',
      nombre: 'Dorsal ancho',
      categoria: 'Espalda',
      descripcion: 'El músculo más amplio del cuerpo humano. Es el motor principal de tracción y aducción escapular, forjando la silueta en V.',
      anchor3D: [0.94, 2.37, -0.46],
      proporciones: [
        { icono: 'body', texto: 'Se extiende desde las vértebras dorsales y lumbares hasta la cresta del húmero.' },
        { icono: 'chart', texto: 'Aporta más del 40% de la amplitud y área visual del torso superior.' },
        { icono: 'joint', texto: 'Posee fibras superiores (amplitud alar) y lumbares inferiores (profundidad).' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Dominadas pronadas con lastre',
          enfoque: 'Patrón de tracción vertical supremo para construir amplitud en V',
          series: '4',
          repeticiones: '6 - 8',
          descanso: '90 - 120 seg',
          nivel: 'Avanzado',
          tempo: '3-0-1-0',
          tips: [
            'Inicia el movimiento deprimiendo las escápulas antes de flexionar los brazos.',
            'Lleva el pecho hacia la barra en lugar de solo pasar la barbilla.',
            'Extiende los brazos completamente al bajar sin relajación de hombros.'
          ],
          pasos: [
            'Cuélgate de la barra con agarre ligeramente superior al ancho de hombros.',
            'Tira con la espalda dorsal hasta que el mentón pase la barra con facilidad.',
            'Desciende con control absoluto durante 3 segundos.'
          ],
          erroresComunes: [
            'Usar balanceo o pataleo de piernas (kipping) sin control muscular.',
            'Hacer solo la mitad del recorrido sin estirar el dorsal abajo.'
          ]
        },
        {
          nombre: 'Jalón al pecho con agarre neutro',
          enfoque: 'Rango controlado sin sobrecargar el manguito rotador',
          series: '4',
          repeticiones: '10 - 12',
          descanso: '75 seg',
          nivel: 'Principiante - Intermedio',
          tempo: '3-1-1-0',
          tips: [
            'Mantén el pecho levantado con leve inclinación de 15° hacia atrás.',
            'Tira llevando los codos hacia abajo y hacia los bolsillos traseros.',
            'Pausa de 1 segundo con la barra cerca del esternón.'
          ],
          pasos: [
            'Ajusta el rodillo sobre los muslos para evitar levantarte.',
            'Tracciona la barra hacia la parte superior del pecho.',
            'Regresa en 3 segundos estirando las alas dorsales.'
          ],
          erroresComunes: [
            'Inclinarse excesivamente hacia atrás convirtiendo el jalón en un remo.',
            'Tirar con los bíceps flexionando las muñecas en exceso.'
          ]
        },
        {
          nombre: 'Remo unilateral con mancuerna',
          enfoque: 'Recorrido completo pegado a la cadera para máximo grosor dorsal',
          series: '4',
          repeticiones: '10 - 12',
          descanso: '60 seg por lado',
          nivel: 'Intermedio',
          tempo: '2-1-1-0',
          tips: [
            'Tira la mancuerna en un arco hacia la cadera, no hacia el hombro.',
            'Espalda plana paralela al suelo con el core activado.',
            'Siente la contracción profunda en el costado de la espalda.'
          ],
          pasos: [
            'Apoya una mano y rodilla sobre el banco con el torso recto.',
            'Tracciona la mancuerna llevando el codo pegado al torso hacia la cresta ilíaca.',
            'Baja estirando el dorsal sin rotar la columna.'
          ],
          erroresComunes: [
            'Rotar violentamente el torso hacia el lado del levantamiento.',
            'Tirar la mancuerna hacia el pecho cargando el bíceps.'
          ]
        },
        {
          nombre: 'Pull-over en polea con barra recta',
          enfoque: 'Aislamiento puro en extensión sin intervención del bíceps',
          series: '3',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Intermedio',
          tempo: '3-1-1-1',
          tips: [
            'Brazos prácticamente rectos con ligera flexión fija en los codos.',
            'Inclina el torso 30° con cadera hacia atrás.',
            'Lleva la barra hacia los muslos comprimiendo los dorsales.'
          ],
          pasos: [
            'Sujeta la barra en polea alta con agarre pronado.',
            'Traza un arco amplio hacia abajo hasta rozar los muslos.',
            'Siente el estiramiento superior en la fase de regreso.'
          ],
          erroresComunes: [
            'Flexionar y extender los codos convirtiéndolo en un ejercicio de tríceps.',
            'Usar peso excesivo que curve la espalda lumbar.'
          ]
        }
      ],
      ejercicios: ['Dominadas pronadas con lastre', 'Jalón al pecho con agarre neutro', 'Remo unilateral con mancuerna', 'Pull-over en polea con barra recta']
    },
    cuadriceps: {
      id: 'cuadriceps',
      nombre: 'Cuádriceps femoral',
      categoria: 'Pierna Anterior',
      descripcion: 'El grupo muscular más fuerte y masivo del tren inferior, indispensable para la extensión de rodilla y la potencia atlética.',
      anchor3D: [0.53, -0.95, 0.25],
      proporciones: [
        { icono: 'body', texto: 'Cubre toda la cara frontal y lateral del fémur desde la cadera a la rótula.' },
        { icono: 'chart', texto: 'Representa aproximadamente el 55% de la masa muscular del muslo.' },
        { icono: 'joint', texto: 'Compuesto por 4 cabezas: vasto lateral, vasto medial, intermedio y recto femoral.' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Sentadilla trasera con barra',
          enfoque: 'Fuerza máxima y reclutamiento completo de todo el tren inferior',
          series: '4',
          repeticiones: '6 - 8',
          descanso: '120 seg',
          nivel: 'Avanzado',
          tempo: '3-1-1-0',
          tips: [
            'Pies a la anchura de hombros con puntas ligeramente hacia afuera (15-30°).',
            'Inhala profundo hacia el diafragma y fija el core antes de bajar (Maniobra de Valsalva).',
            'Rompe la paralela (cadera por debajo de rodillas) con rodillas alineadas a los pies.'
          ],
          pasos: [
            'Apoya la barra sobre los trapecios y retírala con paso firme.',
            'Desciende con control llevando las rodillas hacia adelante y caderas abajo.',
            'Empuja contra el piso extendiendo rodillas y caderas con potencia.'
          ],
          erroresComunes: [
            'Valgo de rodilla (rodillas colapsando hacia adentro al subir).',
            'Levantar los talones del suelo durante el descenso.'
          ]
        },
        {
          nombre: 'Prensa a 45 grados pesada',
          enfoque: 'Volumen hipertrófico con estabilidad para la columna',
          series: '4',
          repeticiones: '10 - 12',
          descanso: '90 seg',
          nivel: 'Intermedio',
          tempo: '3-0-1-0',
          tips: [
            'Pies en la parte baja de la plataforma a la anchura de caderas para más cuádriceps.',
            'Nunca bloquees rígidamente las rodillas en la extensión completa.',
            'Mantén la pelvis bien pegada al respaldo para cuidar la zona lumbar.'
          ],
          pasos: [
            'Siéntate con espalda y cadera firmemente apoyadas.',
            'Desciende el trineo flexionando rodillas hasta rozar el pecho con los muslos.',
            'Empuja desde los talones y la bola del pie sin bloquear articulaciones.'
          ],
          erroresComunes: [
            'Despegar el glúteo del respaldo provocando flexión lumbar bajo carga.',
            'Hacer repeticiones cortas (rango de movimiento parcial).'
          ]
        },
        {
          nombre: 'Sentadilla Hack profunda',
          enfoque: 'Aislamiento con énfasis en el vasto lateral y la lágrima medial',
          series: '4',
          repeticiones: '10 - 12',
          descanso: '90 seg',
          nivel: 'Intermedio - Avanzado',
          tempo: '3-1-1-0',
          tips: [
            'Espalda fija en el soporte permitiendo un gran avance de rodilla seguro.',
            'Desciende de forma lenta y pausada para maximizar la tensión mecánica.',
            'Pausa de medio segundo abajo sin rebotar en los topes.'
          ],
          pasos: [
            'Apoya hombros y espalda en la máquina con pies en la plataforma.',
            'Baja flexionando rodillas sintiendo toda la carga en los muslos frontales.',
            'Sube con fuerza constante manteniendo el contacto total del torso.'
          ],
          erroresComunes: [
            'Despegar los talones de la base durante la bajada.',
            'Subir rápido perdiendo la tensión controlada en el cuádriceps.'
          ]
        },
        {
          nombre: 'Extensiones de cuádriceps en máquina',
          enfoque: 'Pico de contracción terminal y aislamiento del recto femoral',
          series: '3',
          repeticiones: '15',
          descanso: '60 seg',
          nivel: 'Principiante - Intermedio',
          tempo: '2-1-1-1',
          tips: [
            'Ajusta el respaldo para que el eje de rotación coincida con tus rodillas.',
            'Pausa de 1 segundo apretando las piernas al máximo arriba.',
            'Resiste el retorno en 2 segundos completos.'
          ],
          pasos: [
            'Siéntate y acomoda el rodillo justo por encima de los tobillos.',
            'Extiende las rodillas hasta la posición horizontal completa.',
            'Regresa despacio sintiendo el bombeo sanguíneo en los cuádriceps.'
          ],
          erroresComunes: [
            'Lanzar las piernas con balanceo explosivo.',
            'Colocar el rodillo demasiado alto sobre las tibias o muy bajo sobre los pies.'
          ]
        }
      ],
      ejercicios: ['Sentadilla trasera con barra', 'Prensa a 45 grados pesada', 'Sentadilla Hack profunda', 'Extensiones de cuádriceps en máquina']
    },
    gluteos: {
      id: 'gluteos',
      nombre: 'Glúteos',
      categoria: 'Cadera',
      descripcion: 'El complejo muscular con mayor generación de potencia del cuerpo, esencial para la extensión, abducción y estabilización de la pelvis.',
      anchor3D: [0.45, 0.38, -0.24],
      proporciones: [
        { icono: 'body', texto: 'Forma la región glútea dorsal uniendo el ilíaco y sacro con el trocánter mayor.' },
        { icono: 'chart', texto: 'El músculo individual más grande y potente de toda la anatomía humana.' },
        { icono: 'joint', texto: 'Comprende el glúteo mayor (extensión) y glúteo medio/menor (abducción y estabilidad).' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Hip Thrust pesado con barra',
          enfoque: 'Vector de fuerza horizontal óptimo con pico en máxima contracción',
          series: '4',
          repeticiones: '8 - 10',
          descanso: '90 - 120 seg',
          nivel: 'Intermedio - Avanzado',
          tempo: '2-2-1-0',
          tips: [
            'Mirada hacia adelante fija en todo momento (barbilla al pecho).',
            'Pies a distancia tal que en la cima las tibias queden perpendiculares al piso (90°).',
            'Aprieta los glúteos con fuerza durante 2 segundos arriba.'
          ],
          pasos: [
            'Apoya la espalda alta sobre el banco con la barra acolchada en la pelvis.',
            'Extiende la cadera empujando desde los talones hasta nivelar el cuerpo.',
            'Desciende controladamente sin relajar la tensión en los glúteos.'
          ],
          erroresComunes: [
            'Arquear la espalda lumbar hacia atrás en la cima en lugar de bascular la pelvis.',
            'Empujar con las puntas de los pies en vez de los talones.'
          ]
        },
        {
          nombre: 'Zancadas búlgaras con mancuernas',
          enfoque: 'Sobrecarga excéntrica unilateral y equilibrio pélvico',
          series: '3',
          repeticiones: '10 - 12 por pierna',
          descanso: '75 seg por lado',
          nivel: 'Intermedio - Avanzado',
          tempo: '3-0-1-0',
          tips: [
            'Inclina levemente el torso hacia adelante para activar más glúteo que cuádriceps.',
            'Pie trasero apoyado sobre el banco en empeine o puntera.',
            'Baja en línea diagonal descendente hasta rozar el suelo con la rodilla trasera.'
          ],
          pasos: [
            'Colócate frente al banco con un pie apoyado atrás.',
            'Flexiona la pierna delantera bajando en 3 segundos con control.',
            'Empuja desde el talón delantero para reincorporarte.'
          ],
          erroresComunes: [
            'Colocar el pie delantero demasiado cerca del banco limitando el recorrido.',
            'Permitir que la rodilla delantera colapse hacia adentro.'
          ]
        },
        {
          nombre: 'Patada de glúteo en polea baja',
          enfoque: 'Aislamiento del glúteo mayor en hiperextensión terminal',
          series: '3',
          repeticiones: '12 - 15',
          descanso: '45 seg por lado',
          nivel: 'Principiante - Intermedio',
          tempo: '2-1-1-1',
          tips: [
            'Tobillera bien ajustada en polea baja.',
            'Extiende la pierna hacia atrás y ligeramente hacia afuera (ángulo de 30°).',
            'No arquees la espalda baja: la extensión debe provenir de la cadera.'
          ],
          pasos: [
            'Inclínate 45° sosteniéndote de la torre de poleas.',
            'Lleva la pierna hacia atrás apretando el glúteo en el punto álgido.',
            'Regresa en 2 segundos resistiendo el tirón del cable.'
          ],
          erroresComunes: [
            'Mover la columna lumbar para subir más la pierna.',
            'Usar peso excesivo que impida la contracción máxima.'
          ]
        },
        {
          nombre: 'Abducciones en máquina sentada',
          enfoque: 'Enfoque directo en la porción superior y glúteo medio para estabilidad',
          series: '4',
          repeticiones: '15 - 20',
          descanso: '60 seg',
          nivel: 'Principiante',
          tempo: '2-1-1-1',
          tips: [
            'Inclina el torso ligeramente hacia adelante apoyándote en los mangos.',
            'Abre las piernas lo máximo posible sintiendo la parte lateral de la cadera.',
            'Pausa de 1 segundo en apertura total antes de cerrar.'
          ],
          pasos: [
            'Siéntate con las almohadillas apoyadas en la parte externa de las rodillas.',
            'Abre con fuerza resistiendo los resortes o placas.',
            'Cierra lentamente sin permitir que los pesos choquen.'
          ],
          erroresComunes: [
            'Cerrar de golpe perdiendo la tensión muscular.',
            'Empujar con los pies en lugar de empujar con las rodillas.'
          ]
        }
      ],
      ejercicios: ['Hip Thrust pesado con barra', 'Zancadas búlgaras con mancuernas', 'Patada de glúteo en polea baja', 'Abducciones en máquina sentada']
    },
    trapecio: {
      id: 'trapecio',
      nombre: 'Trapecio',
      categoria: 'Espalda Alta',
      descripcion: 'Músculo superficial que ocupa el centro de la espalda alta y el cuello, permitiendo elevar y retraer las escápulas.',
      anchor3D: [0.35, 4.01, -0.34],
      proporciones: [
        { icono: 'body', texto: 'Va desde la base del cráneo hasta las vértebras dorsales medias.' },
        { icono: 'chart', texto: 'Aporta densidad al cuello y la parte superior de los hombros.' },
        { icono: 'joint', texto: 'Dividido en porción superior (elevación), media (retracción) e inferior (depresión).' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Encogimientos con mancuernas',
          enfoque: 'Elevación pura del trapecio superior con pausa de 2 segundos en la cima',
          series: '4',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Principiante - Intermedio',
          tempo: '2-2-1-0',
          tips: [
            'Eleva los hombros en línea recta hacia las orejas.',
            'No rotes los hombros en círculos para proteger el manguito rotador.',
            'Sostén 2 segundos arriba en máxima contracción.'
          ],
          pasos: [
            'Toma mancuernas pesadas a los costados con brazos estirados.',
            'Sube los hombros lo más alto posible contrayendo los trapecios.',
            'Desciende con control sintiendo el estiramiento en la base del cuello.'
          ],
          erroresComunes: [
            'Rotar los hombros hacia adelante o atrás durante el encogimiento.',
            'Doblar los codos jalando con los brazos en vez de los trapecios.'
          ]
        },
        {
          nombre: 'Paseo del granjero (Farmer Walk)',
          enfoque: 'Tensión isométrica masiva y resistencia brutal de agarre',
          series: '4',
          repeticiones: '40 metros',
          descanso: '90 seg',
          nivel: 'Intermedio - Avanzado',
          tempo: 'Paso firme',
          tips: [
            'Espalda erguida, hombros atrás y core activo.',
            'Camina con pasos cortos, estables y deliberados.',
            'No permitas que las mancuernas se balanceen contra las piernas.'
          ],
          pasos: [
            'Levanta dos mancuernas o barras pesadas desde el suelo con técnica de peso muerto.',
            'Camina la distancia fijada con postura inquebrantable.',
            'Desciende el peso de forma segura flexionando caderas y rodillas.'
          ],
          erroresComunes: [
            'Encorvar los hombros hacia adelante bajo el peso.',
            'Caminar tambaleándose por exceso de carga.'
          ]
        },
        {
          nombre: 'Face Pull con cuerda en polea',
          enfoque: 'Activación del trapecio medio e inferior y salud escapular',
          series: '4',
          repeticiones: '15',
          descanso: '60 seg',
          nivel: 'Principiante - Intermedio',
          tempo: '2-1-1-1',
          tips: [
            'Coloca la polea a la altura de los ojos o frente.',
            'Tira la cuerda hacia el rostro separando los pulgares hacia atrás.',
            'Siente cómo se juntan los omóplatos en la espalda media.'
          ],
          pasos: [
            'Sujeta la cuerda con agarre neutro y pulgares apuntando hacia ti.',
            'Tracciona hacia la cara abriendo los codos hacia los lados.',
            'Pausa un segundo y regresa despacio manteniendo la tensión.'
          ],
          erroresComunes: [
            'Usar peso excesivo que obligue a balancear el tronco.',
            'Bajar los codos por debajo de la altura de los hombros.'
          ]
        }
      ],
      ejercicios: ['Encogimientos con mancuernas', 'Paseo del granjero', 'Face Pull con cuerda']
    },
    lumbares: {
      id: 'lumbares',
      nombre: 'Lumbares / Erectores espinales',
      categoria: 'Espalda Baja',
      descripcion: 'Músculos profundos y paravertebrales fundamentales para la postura erecta, extensión del tronco y protección discal.',
      anchor3D: [0.0, 1.14, -0.33],
      proporciones: [
        { icono: 'body', texto: 'Recorren longitudinalmente la zona baja de la columna vertebral.' },
        { icono: 'chart', texto: 'Base fundamental de transferencia de carga axial del cuerpo.' },
        { icono: 'joint', texto: 'Trabajan en conjunto con el glúteo y los isquiotibiales en la cadena posterior.' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Peso muerto rumano con barra',
          enfoque: 'Bisagra de cadera y tensión estricta en toda la cadena posterior',
          series: '4',
          repeticiones: '8 - 10',
          descanso: '90 seg',
          nivel: 'Intermedio',
          tempo: '3-1-1-0',
          tips: [
            'Lleva la cadera hacia atrás como si quisieras tocar una pared con los glúteos.',
            'Barra pegada a los muslos y espinillas durante todo el trayecto.',
            'Espalda completamente neutra: no curves la zona lumbar.'
          ],
          pasos: [
            'De pie con la barra sostenida a la anchura de hombros.',
            'Empuja la cadera hacia atrás manteniendo las rodillas con ligera flexión fija.',
            'Baja hasta sentir el estiramiento y extiende la cadera con potencia.'
          ],
          erroresComunes: [
            'Flexionar la columna vertebral redondeando la espalda baja.',
            'Doblar las rodillas como si fuera una sentadilla.'
          ]
        },
        {
          nombre: 'Hiperextensiones a 45 grados',
          enfoque: 'Fortalecimiento de los erectores espinales sin compresión axial excesiva',
          series: '3',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Principiante - Intermedio',
          tempo: '2-1-1-1',
          tips: [
            'Alinea la almohadilla superior justo por debajo de la cresta ilíaca.',
            'Sube solo hasta que el cuerpo quede en línea recta, no te hiperextiendas.',
            'Opcional: sostén un disco en el pecho para mayor resistencia.'
          ],
          pasos: [
            'Colócate en el banco de 45° con los tobillos bien asegurados.',
            'Baja doblando la cadera manteniendo la espalda recta.',
            'Extiende la cadera contrayendo glúteos y lumbares 1 segundo.'
          ],
          erroresComunes: [
            'Arquear bruscamente la columna hacia atrás en la cima.',
            'Bajar de forma descontrolada rebotando en el fondo.'
          ]
        },
        {
          nombre: 'Buenos días con barra',
          enfoque: 'Patrón de bisagra de cadera con énfasis en la estabilidad paravertebral',
          series: '3',
          repeticiones: '10 - 12',
          descanso: '75 seg',
          nivel: 'Avanzado',
          tempo: '3-0-1-0',
          tips: [
            'Barra apoyada sobre los trapecios exactamente como en sentadilla.',
            'Carga moderada con foco prioritario en la técnica perfecta.',
            'Lleva las caderas hacia atrás con el pecho orgulloso.'
          ],
          pasos: [
            'De pie con los pies a la anchura de caderas y barra en la espalda.',
            'Inclina el torso hacia adelante empujando los glúteos hacia atrás.',
            'Regresa a la posición erguida empujando con glúteos y cadena posterior.'
          ],
          erroresComunes: [
            'Cargar peso excesivo que doble la columna dorsal.',
            'Mover las rodillas hacia adelante en lugar de llevar la cadera atrás.'
          ]
        }
      ],
      ejercicios: ['Peso muerto rumano', 'Hiperextensiones a 45 grados', 'Buenos días con barra']
    },
    isquiotibiales: {
      id: 'isquiotibiales',
      nombre: 'Isquiotibiales / Femoral',
      categoria: 'Pierna Posterior',
      descripcion: 'Grupo muscular de la cara posterior del muslo, clave en la flexión de rodilla, desaceleración y velocidad de zancada.',
      anchor3D: [0.46, -1.09, -0.2],
      proporciones: [
        { icono: 'body', texto: 'Conectan la tuberosidad isquiática de la pelvis con la tibia y peroné.' },
        { icono: 'chart', texto: 'Representan el 40-45% de la fuerza total del tren inferior.' },
        { icono: 'joint', texto: 'Compuesto por bíceps femoral (cabeza larga y corta), semitendinoso y semimembranoso.' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Curl femoral tumbado',
          enfoque: 'Flexión de rodilla en rango acortado con tensión continua',
          series: '4',
          repeticiones: '10 - 12',
          descanso: '75 seg',
          nivel: 'Principiante - Intermedio',
          tempo: '3-1-1-0',
          tips: [
            'Mantén la pelvis pegada a la máquina en todo momento.',
            'Flexiona los tobillos (pies en punta o neutros) para evitar calambres en pantorrilla.',
            'Pausa de 1 segundo en máxima flexión rozando los glúteos con el rodillo.'
          ],
          pasos: [
            'Acuéstate boca abajo con el rodillo detrás de los tobillos.',
            'Flexiona las rodillas subiendo el peso con control.',
            'Desciende en 3 segundos resistiendo el retorno.'
          ],
          erroresComunes: [
            'Levantar la cadera del banco para compensar el peso.',
            'Soltar el peso sin controlar la fase excéntrica.'
          ]
        },
        {
          nombre: 'Peso muerto rumano con mancuernas',
          enfoque: 'Estiramiento bajo carga con bisagra de cadera profunda',
          series: '4',
          repeticiones: '10 - 12',
          descanso: '75 seg',
          nivel: 'Intermedio',
          tempo: '3-1-1-0',
          tips: [
            'Mancuernas deslizándose pegadas a las espinillas.',
            'Flexión mínima en rodillas (15-20° constantes).',
            'Siente un estiramiento potente en la parte posterior de los muslos.'
          ],
          pasos: [
            'De pie con mancuernas al frente y hombros encajados.',
            'Empuja la cadera hacia atrás bajando hasta media espinilla.',
            'Extiende la cadera contrayendo isquiotibiales y glúteos.'
          ],
          erroresComunes: [
            'Separar las mancuernas del cuerpo cargando la zona lumbar.',
            'Bajar demasiado flexionando la espalda en vez de la cadera.'
          ]
        },
        {
          nombre: 'Curl femoral sentado en máquina',
          enfoque: 'Máximo torque en posición estirada del isquiotibial',
          series: '4',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Intermedio',
          tempo: '3-1-1-0',
          tips: [
            'La posición sentada coloca la cadera en flexión estirando el músculo desde su origen.',
            'Fija bien el soporte sobre los muslos para no deslizarte.',
            'Baja en 3 segundos sintiendo la tensión profunda.'
          ],
          pasos: [
            'Siéntate con espalda apoyada y rodillo sobre las pantorrillas.',
            'Empuja el rodillo hacia abajo flexionando las rodillas con fuerza.',
            'Regresa despacio controlando la apertura articular.'
          ],
          erroresComunes: [
            'No ajustar el rodillo superior, levantando los muslos en cada repetición.',
            'Hacer repeticiones rápidas y a tirones.'
          ]
        }
      ],
      ejercicios: ['Curl femoral tumbado', 'Peso muerto rumano con mancuernas', 'Curl femoral sentado']
    },
    gemelos: {
      id: 'gemelos',
      nombre: 'Gemelos y Sóleo',
      categoria: 'Pantorrillas',
      descripcion: 'Músculos del compartimento posterior de la pierna, responsables de la flexión plantar del pie y el despegue en el salto.',
      anchor3D: [0.44, -2.57, -0.23],
      proporciones: [
        { icono: 'body', texto: 'Se originan en los cóndilos femorales y se insertan en el tendón de Aquiles.' },
        { icono: 'chart', texto: 'Soportan múltiples veces el peso corporal en cada zancada y salto.' },
        { icono: 'joint', texto: 'Formado por gastrocnemio (fibras rápidas) y sóleo profundo (fibras lentas).' }
      ],
      ejerciciosDetalle: [
        {
          nombre: 'Elevación de talones de pie con barra',
          enfoque: 'Énfasis en el gastrocnemio con rodilla extendida para volumen de pantorrilla',
          series: '4',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Principiante - Intermedio',
          tempo: '2-2-1-1',
          tips: [
            'Rodillas completamente extendidas sin balanceo.',
            'Pausa de 2 segundos en el fondo en máximo estiramiento para eliminar el reflejo miotático.',
            'Eleva lo más alto posible sobre el dedo gordo del pie.'
          ],
          pasos: [
            'Apoya las bolas de los pies en un escalón con la barra o máquina en los hombros.',
            'Desciende los talones por debajo del nivel del escalón sintiendo el estiramiento.',
            'Sube con fuerza y contrae 2 segundos en la cúspide.'
          ],
          erroresComunes: [
            'Rebotar en el fondo usando la elasticidad del tendón de Aquiles en lugar del músculo.',
            'Doblar las rodillas durante la elevación.'
          ]
        },
        {
          nombre: 'Elevación de talones sentado en máquina',
          enfoque: 'Aislamiento selectivo del sóleo con rodilla a 90°',
          series: '4',
          repeticiones: '15 - 20',
          descanso: '45 seg',
          nivel: 'Principiante',
          tempo: '2-1-1-1',
          tips: [
            'Al estar la rodilla flexionada, el gastrocnemio se desactiva y el sóleo hace todo el trabajo.',
            'Excelente para ensanchar la pantorrilla en vista frontal y posterior.',
            'Rango completo de movimiento sin prisa.'
          ],
          pasos: [
            'Siéntate y acomoda las almohadillas sobre los muslos inferiores.',
            'Desciende los talones profundamente sintiendo estiramiento en la espinilla posterior.',
            'Sube hasta la máxima extensión y aguanta 1 segundo.'
          ],
          erroresComunes: [
            'Usar peso excesivo que acorte el recorrido a unos pocos centímetros.',
            'Hacer repeticiones a ritmo acelerado.'
          ]
        },
        {
          nombre: 'Elevación de talones en prensa',
          enfoque: 'Rango profundo de dorsiflexión y contracción pico con gran carga',
          series: '4',
          repeticiones: '12 - 15',
          descanso: '60 seg',
          nivel: 'Intermedio',
          tempo: '2-2-1-1',
          tips: [
            'Solo las puntas de los pies en el borde inferior de la plataforma de la prensa.',
            'Mantén las rodillas con un microdesbloqueo de seguridad.',
            'Pausa profunda de 2 segundos abajo para máximo reclutamiento de fibras.'
          ],
          pasos: [
            'Coloca los metatarsos en el borde de la plataforma.',
            'Deja caer los talones estirando las pantorrillas.',
            'Empuja la plataforma con las puntas de los pies extendiendo los tobillos.'
          ],
          erroresComunes: [
            'Pies resbalando del borde por mala colocación.',
            'Bloquear hiper-extendiendo las rodillas.'
          ]
        }
      ],
      ejercicios: ['Elevación de talones de pie con barra', 'Elevación de talones sentado', 'Elevación de talones en prensa']
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
    return Boolean(this.getActiveMembership());
  }

  getActiveMembership(): any {
    const p = this.profileData();
    if (!p) return null;
    return p.activeMembership || p.membresiaActiva || p.membresia || p.membership || p.plan || p.userMembership || null;
  }

  getMembershipName(): string {
    const mem = this.getActiveMembership();
    if (!mem) return '';
    if (typeof mem === 'string') return mem.toLowerCase();
    return (mem.nombre || mem.name || mem.tipo || mem.title || '').toLowerCase();
  }

  hasFullAccess(): boolean {
    const name = this.getMembershipName();
    if (!name) {
      // Si la membresía está activa en el perfil pero el nombre aún no se ha mapeado o es un objeto activo
      return Boolean(this.getActiveMembership());
    }
    // Otorga acceso a Plata, Oro, Silver, Gold, VIP, Pro, Premium, Full o cualquier plan activo distinto de bronce
    if (name.includes('bronce') || name.includes('bronze')) return false;
    return (
      name.includes('plata') ||
      name.includes('oro') ||
      name.includes('silver') ||
      name.includes('gold') ||
      name.includes('vip') ||
      name.includes('pro') ||
      name.includes('premium') ||
      name.includes('full') ||
      name.length > 0
    );
  }

  isBronce(): boolean {
    const name = this.getMembershipName();
    return name.includes('bronce') || name.includes('bronze');
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
        if (this.activeSection === 'musculos' && this.hasFullAccess()) {
          setTimeout(() => this.init3DMuscleExplorer(), 150);
        }
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

  // Async Payment Flow State (PaymentsController)
  paymentStep = signal<'form' | 'pse_form' | 'card_3ds' | 'processing' | 'polling' | 'result'>('form');
  paymentReference = signal<string>('');
  pollingMessage = signal<string>('');
  paymentResult = signal<PaymentStatusResponse | null>(null);

  // Card Form & 3D Secure Signals
  simulatedCards = SIMULATED_CARDS_CONFIG;
  selectedDemoCard = signal<SimulatedCardConfig | null>(null);
  card3dsAuthCode = signal<string>('');
  card3dsError = signal<string>('');

  get detectedCardBrandInfo() {
    return detectCardBrand(this.cardNumber());
  }

  get cardLast4(): string {
    const raw = this.cardNumber().replace(/\D/g, '');
    return raw.length >= 4 ? raw.slice(-4) : '••••';
  }

  fillDemoCard(card: SimulatedCardConfig) {
    this.selectedDemoCard.set(card);
    this.cardNumber.set(card.cardNumber);
    this.cardHolder.set(card.cardHolder);
    this.cardExp.set(card.cardExp);
    this.cardCvv.set(card.cardCvv);
    this.card3dsAuthCode.set(card.authCode);
    this.cardNumberError.set('');
    this.cardHolderError.set('');
    this.cardExpError.set('');
    this.cardCvvError.set('');
    this.card3dsError.set('');
  }

  // PSE Form Specific Signals
  pseDocType = signal<string>('CC');
  pseDocNumber = signal<string>('');
  pseEmail = signal<string>('');
  psePhone = signal<string>('');
  pseHolderName = signal<string>('');

  // Simulated Bank Portal Flow State (Academic demo)
  bankAuthSubStep = signal<'login' | 'auth_code'>('login');
  simulatedUser = signal<string>('');
  simulatedPassword = signal<string>('');
  simulatedAuthCode = signal<string>('');
  simulatedLoginError = signal<string>('');
  simulatedAuthCodeError = signal<string>('');

  /** Configuración dinámica del banco actualmente seleccionado */
  get currentBankConfig(): BankConfig {
    return getBankConfig(this.selectedBank());
  }

  /** Al cambiar de banco, pre-diligenciamos credenciales demo sugeridas y reseteamos a login */
  onBankChange(newBank: string) {
    this.selectedBank.set(newBank);
    this.bankAuthSubStep.set('login');
    this.simulatedPassword.set('');
    this.simulatedAuthCode.set('');
    this.simulatedLoginError.set('');
    this.simulatedAuthCodeError.set('');
    
    // Autocompletar usuario o teléfono demo de la sugerencia
    const config = getBankConfig(newBank);
    this.simulatedUser.set(config.credentials.usernameOrPhone);
  }

  // Validation error signals
  cardNumberError = signal<string>('');
  cardExpError = signal<string>('');
  cardCvvError = signal<string>('');
  cardHolderError = signal<string>('');

  pseDocNumberError = signal<string>('');
  pseEmailError = signal<string>('');
  psePhoneError = signal<string>('');
  pseHolderNameError = signal<string>('');

  buyPlan(id: number) {
    const plan = this.availablePlans().find(p => p.idMembresia === id);
    if (!plan) return;

    this.resetCheckoutForm();
    const profile = this.profileData();
    if (profile) {
      this.pseHolderName.set(`${profile.nombre || ''} ${profile.apellidos || ''}`.trim());
      this.pseEmail.set(profile.email || '');
      if (profile.telefono) {
        this.psePhone.set(profile.telefono);
      }
    }

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

  // ── Validaciones de formulario de tarjeta ──
  private validateCardForm(): boolean {
    let valid = true;
    this.cardNumberError.set('');
    this.cardExpError.set('');
    this.cardCvvError.set('');
    this.cardHolderError.set('');

    if (this.selectedPaymentMethod() === 'TARJETA') {
      // Validar titular
      const holder = this.cardHolder().trim();
      if (!holder) {
        this.cardHolderError.set('El nombre del titular es obligatorio.');
        valid = false;
      } else if (holder.length < 3) {
        this.cardHolderError.set('El nombre debe tener al menos 3 caracteres.');
        valid = false;
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(holder)) {
        this.cardHolderError.set('El nombre solo puede contener letras y espacios.');
        valid = false;
      }

      // Validar número de tarjeta (16 dígitos)
      const rawNumber = this.cardNumber().replace(/\s/g, '');
      if (!rawNumber) {
        this.cardNumberError.set('El número de tarjeta es obligatorio.');
        valid = false;
      } else if (!/^\d{13,19}$/.test(rawNumber)) {
        this.cardNumberError.set('Ingresa un número de tarjeta válido (13-19 dígitos).');
        valid = false;
      } else if (!this.luhnCheck(rawNumber)) {
        this.cardNumberError.set('El número de tarjeta no es válido (verificación Luhn).');
        valid = false;
      }

      // Validar fecha de vencimiento (MM/YY)
      const exp = this.cardExp().trim();
      if (!exp) {
        this.cardExpError.set('La fecha de vencimiento es obligatoria.');
        valid = false;
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) {
        this.cardExpError.set('Formato inválido. Usa MM/YY.');
        valid = false;
      } else {
        const [mm, yy] = exp.split('/').map(Number);
        const now = new Date();
        const expDate = new Date(2000 + yy, mm); // Primer día del mes siguiente
        if (expDate <= now) {
          this.cardExpError.set('La tarjeta está vencida.');
          valid = false;
        }
      }

      // Validar CVV (3-4 dígitos)
      const cvv = this.cardCvv().trim();
      if (!cvv) {
        this.cardCvvError.set('El CVV es obligatorio.');
        valid = false;
      } else if (!/^\d{3,4}$/.test(cvv)) {
        this.cardCvvError.set('El CVV debe tener 3 o 4 dígitos.');
        valid = false;
      }
    }

    return valid;
  }

  /** Validaciones inline del formulario PSE */
  private validatePseForm(): boolean {
    let valid = true;
    this.pseHolderNameError.set('');
    this.pseDocNumberError.set('');
    this.pseEmailError.set('');
    this.psePhoneError.set('');

    const holder = this.pseHolderName().trim();
    if (!holder) {
      this.pseHolderNameError.set('El nombre del titular es obligatorio.');
      valid = false;
    } else if (holder.length < 3) {
      this.pseHolderNameError.set('El nombre debe tener al menos 3 caracteres.');
      valid = false;
    }

    const docNum = this.pseDocNumber().trim();
    if (!docNum) {
      this.pseDocNumberError.set('El número de documento es obligatorio.');
      valid = false;
    } else if (!/^[a-zA-Z0-9]{5,15}$/.test(docNum)) {
      this.pseDocNumberError.set('Ingresa un número de documento válido (5 a 15 caracteres).');
      valid = false;
    }

    const email = this.pseEmail().trim();
    if (!email) {
      this.pseEmailError.set('El correo electrónico es obligatorio.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.pseEmailError.set('Ingresa un correo electrónico válido (ejemplo@dominio.com).');
      valid = false;
    }

    const phone = this.psePhone().trim();
    if (!phone) {
      this.psePhoneError.set('El celular/teléfono es obligatorio.');
      valid = false;
    } else if (!/^\d{7,10}$/.test(phone)) {
      this.psePhoneError.set('Ingresa un número telefónico válido (7 a 10 dígitos).');
      valid = false;
    }

    if (!this.selectedBank()) {
      this.alertService.error('Debes seleccionar un banco.');
      valid = false;
    }

    return valid;
  }

  /** Algoritmo de Luhn para validar números de tarjeta */
  private luhnCheck(num: string): boolean {
    let sum = 0;
    let alternate = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let n = parseInt(num.charAt(i), 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  /** Formatea el número de tarjeta agregando espacios cada 4 dígitos */
  formatCardNumber(value: string) {
    const cleaned = value.replace(/\D/g, '').slice(0, 19);
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.cardNumber.set(formatted);
  }

  /** Formatea la expiración MM/YY */
  formatCardExp(value: string) {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      this.cardExp.set(cleaned.slice(0, 2) + '/' + cleaned.slice(2));
    } else {
      this.cardExp.set(cleaned);
    }
  }

  /** Paso 1: Acción al presionar el botón en el menú inicial (NO procesa el pago directamente) */
  onInitialCheckoutSubmit() {
    if (this.selectedPaymentMethod() === 'TARJETA') {
      if (!this.validateCardForm()) return;
      // Pasa al portal de validación 3D Secure / OTP de la franquicia sin procesar directamente
      this.card3dsError.set('');
      if (!this.card3dsAuthCode()) {
        this.card3dsAuthCode.set(this.selectedDemoCard()?.authCode || '123456');
      }
      this.paymentStep.set('card_3ds');
    } else if (this.selectedPaymentMethod() === 'PSE') {
      if (!this.selectedBank()) {
        this.alertService.error('Debes seleccionar un banco para continuar.');
        return;
      }
      // Pasa al formulario de pago PSE del banco seleccionado sin ejecutar la transacción
      this.onBankChange(this.selectedBank());
      this.paymentStep.set('pse_form');
    }
  }

  /** Sub-Paso 2 de Tarjeta: Validar Código 3D Secure / OTP SMS y procesar el cobro */
  submitCard3dsAuth() {
    if (this.isProcessingPayment()) return;
    this.card3dsError.set('');
    const code = this.card3dsAuthCode().trim();

    if (!code) {
      this.card3dsError.set('Ingresa el código de verificación SMS / 3D Secure.');
      return;
    }

    const isDecline = code === '000000' || this.selectedDemoCard()?.type === 'declined';

    if (code !== '123456' && code !== '000000' && code !== this.selectedDemoCard()?.authCode) {
      this.card3dsError.set('Código de verificación 3D Secure incorrecto. Utiliza el código demo sugerido: "123456" para aprobar o "000000" para simular rechazo.');
      return;
    }

    this.executePaymentTransaction({ isDecline });
  }

  /** Sub-Paso 1 del Banco: Validar credenciales simuladas (Usuario/Celular + Contraseña) */
  submitSimulatedBankLogin() {
    this.simulatedLoginError.set('');
    const config = this.currentBankConfig;
    const user = this.simulatedUser().trim();
    const pass = this.simulatedPassword().trim();

    if (!user) {
      this.simulatedLoginError.set(`El ${config.labels.userFieldLabel.toLowerCase()} es obligatorio.`);
      return;
    }
    if (!pass) {
      this.simulatedLoginError.set('La contraseña es obligatoria.');
      return;
    }

    // Comprobar credenciales ficticias demo
    if (user !== config.credentials.usernameOrPhone || pass !== config.credentials.password) {
      this.simulatedLoginError.set(
        `Credenciales ficticias incorrectas. Para la simulación demo utiliza ${config.labels.userFieldLabel}: "${config.credentials.usernameOrPhone}" y Contraseña: "${config.credentials.password}".`
      );
      return;
    }

    // Credenciales correctas: Avanzar a clave dinámica / código de autorización
    this.bankAuthSubStep.set('auth_code');
  }

  /** Sub-Paso 2 del Banco: Validar Código de Autorización / Clave Dinámica y procesar el pago */
  submitSimulatedBankAuth() {
    if (this.isProcessingPayment()) return; // Previene doble envío
    this.simulatedAuthCodeError.set('');
    const config = this.currentBankConfig;
    const code = this.simulatedAuthCode().trim();

    if (!code) {
      this.simulatedAuthCodeError.set('El código de autorización es obligatorio.');
      return;
    }

    if (code !== config.credentials.authCode) {
      this.simulatedAuthCodeError.set(
        `Código de autorización ficticio incorrecto. Utiliza el código de prueba: "${config.credentials.authCode}".`
      );
      return;
    }

    // Código válido -> Ejecutar la transacción
    this.executePaymentTransaction();
  }

  /** Paso 2: Procesa el pago PSE después de completar el formulario PSE */
  submitPsePayment() {
    if (this.isProcessingPayment()) return; // Previene doble envío
    if (!this.validatePseForm()) return;
    this.executePaymentTransaction();
  }

  /** Ejecuta la transacción de pago llamando al backend */
  private executePaymentTransaction(options?: { isDecline?: boolean }) {
    const plan = this.targetCheckoutPlan();
    if (!plan) return;

    this.isProcessingPayment.set(true);
    this.paymentStep.set('processing');
    this.pollingMessage.set('Creando sesión de pago segura...');

    // 1. Crear sesión de pago asíncrona via PaymentsController
    const sessionReq = {
      planId: plan.idMembresia,
      paymentMethod: this.selectedPaymentMethod(),
      bankName: this.selectedPaymentMethod() === 'PSE' ? this.selectedBank() : undefined,
      personType: this.selectedPaymentMethod() === 'PSE' ? this.selectedPersonType() : undefined,
      cardHolder: this.selectedPaymentMethod() === 'TARJETA' ? this.cardHolder() : undefined,
      cardNumber: this.selectedPaymentMethod() === 'TARJETA' ? this.cardNumber().replace(/\s/g, '') : undefined,
      cardExpiry: this.selectedPaymentMethod() === 'TARJETA' ? this.cardExp() : undefined,
      cardCvv: this.selectedPaymentMethod() === 'TARJETA' ? this.cardCvv() : undefined
    };

    this.paymentService.createPaymentSession(sessionReq).subscribe({
      next: (session) => {
        this.paymentReference.set(session.referenceId);
        const entityName = this.selectedPaymentMethod() === 'PSE' 
          ? (sessionReq.bankName || 'la entidad bancaria') 
          : `${this.detectedCardBrandInfo.brand} (•••• ${this.cardLast4})`;
        this.pollingMessage.set(`Sesión creada. Contactando a ${entityName}...`);

        // 2. Simular confirmación via webhook (en producción, esto lo haría la pasarela real)
        setTimeout(() => {
          this.pollingMessage.set(options?.isDecline ? 'Verificando fondos y políticas de seguridad...' : 'Contactando entidad emisora para autorización...');
          const amountInCents = Math.round(session.amount * 100);

          const webhookCall = options?.isDecline
            ? this.paymentService.simulateWebhookDecline(session.referenceId, amountInCents)
            : this.paymentService.simulateWebhookApproval(session.referenceId, amountInCents);

          webhookCall.subscribe({
            next: () => {
              // 3. Iniciar polling del estado
              this.paymentStep.set('polling');
              this.pollingMessage.set('Verificando confirmación del pago...');
              this.startPaymentPolling(session.referenceId);
            },
            error: () => {
              // Si falla el webhook, intentar polling de todas formas
              this.paymentStep.set('polling');
              this.pollingMessage.set('Verificando estado del pago...');
              this.startPaymentPolling(session.referenceId);
            }
          });
        }, 1500); // Simula latencia de red de la pasarela
      },
      error: (err) => {
        this.isProcessingPayment.set(false);
        this.paymentStep.set(this.selectedPaymentMethod() === 'PSE' ? 'pse_form' : 'card_3ds');
        const msg = err.error?.message || err.message || 'Error al crear la sesión de pago.';
        this.alertService.error(msg);
      }
    });
  }

  submitPaymentCheckout() {
    this.onInitialCheckoutSubmit();
  }

  /** Inicia polling del estado del pago via PaymentsController/status/{referenceId} */
  private startPaymentPolling(referenceId: string) {
    this.paymentService.pollPaymentStatus(referenceId, 2000, 30).subscribe({
      next: (statusRes) => {
        if (statusRes.status === 'PROCESANDO') {
          this.pollingMessage.set('Esperando confirmación de la entidad bancaria...');
        } else if (statusRes.status === 'APROBADO') {
          this.paymentStep.set('result');
          this.paymentResult.set(statusRes);
          this.pollingMessage.set('¡Pago aprobado exitosamente!');
          this.handlePaymentApproved(statusRes);
        } else {
          // RECHAZADO, CANCELADO, etc.
          this.paymentStep.set('result');
          this.paymentResult.set(statusRes);
          this.pollingMessage.set(statusRes.message);
          this.handlePaymentFailed(statusRes);
        }
      },
      error: (err) => {
        this.isProcessingPayment.set(false);
        this.paymentStep.set('form');
        this.alertService.error('Error al verificar el estado del pago. Intenta nuevamente.');
      }
    });
  }

  /** Maneja un pago aprobado: actualiza UI, muestra recibo */
  private handlePaymentApproved(statusRes: PaymentStatusResponse) {
    this.isProcessingPayment.set(false);

    // Esperar un momento para mostrar la animación de éxito
    setTimeout(() => {
      this.showPaymentCheckoutModal.set(false);
      this.paymentStep.set('form'); // Reset para la próxima vez
      this.fetchProfile();
      this.fetchPlans();

      this.lastReceipt.set({
        idTransaccion: statusRes.referenceId,
        fecha: statusRes.paymentDate ? new Date(statusRes.paymentDate) : new Date(),
        nombreCliente: (this.profileData()?.nombre || '') + ' ' + (this.profileData()?.apellidos || ''),
        planNombre: statusRes.planName,
        total: statusRes.amount,
        metodoPago: statusRes.paymentMethod,
        vigencia: 'Membresía activa'
      });

      this.showReceiptModal.set(true);
      this.alertService.success(this.isUpgradeFlow() ? '✓ Cambio de plan realizado con éxito' : '✓ Pago aprobado y membresía activada');
      this.setSection('membresia');
      this.resetCheckoutForm();
    }, 1500);
  }

  /** Maneja un pago rechazado/fallido */
  private handlePaymentFailed(statusRes: PaymentStatusResponse) {
    this.isProcessingPayment.set(false);
    setTimeout(() => {
      this.paymentStep.set('form'); // Permite reintentar
      this.alertService.error(statusRes.message || 'El pago fue rechazado. Intenta con otro método de pago.');
    }, 2000);
  }

  /** Resetea todos los campos del formulario de checkout */
  private resetCheckoutForm() {
    this.cardNumber.set('');
    this.cardHolder.set('');
    this.cardExp.set('');
    this.cardCvv.set('');
    this.cardNumberError.set('');
    this.cardExpError.set('');
    this.cardCvvError.set('');
    this.cardHolderError.set('');

    this.pseDocNumber.set('');
    this.pseEmail.set('');
    this.psePhone.set('');
    this.pseHolderName.set('');
    this.pseDocNumberError.set('');
    this.pseEmailError.set('');
    this.psePhoneError.set('');
    this.pseHolderNameError.set('');

    this.simulatedUser.set('');
    this.simulatedPassword.set('');
    this.simulatedAuthCode.set('');
    this.simulatedLoginError.set('');
    this.simulatedAuthCodeError.set('');
    this.bankAuthSubStep.set('login');

    this.card3dsAuthCode.set('');
    this.card3dsError.set('');
    this.selectedDemoCard.set(null);

    this.paymentReference.set('');
    this.paymentResult.set(null);
    this.selectedPaymentMethod.set('PSE');
    this.paymentStep.set('form');
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
    this.threeScene.background = null;

    this.threeCamera = new THREE.PerspectiveCamera(
      38,
      width / height,
      0.1,
      1000
    );

    this.threeCamera.position.set(0, 0.70, 18.0);
    this.threeCamera.lookAt(0, 0.70, 0);

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.threeScene.add(ambientLight);

    // Luz frontal principal para resaltar la anatomía y definición muscular
    const frontKey = new THREE.DirectionalLight(0xffffff, 2.8);
    frontKey.position.set(0, 2, 14);
    this.threeScene.add(frontKey);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 10, 10);
    this.threeScene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa5c4e8, 1.2);
    fillLight.position.set(-8, 6, 8);
    this.threeScene.add(fillLight);

    const rimBackLeft = new THREE.DirectionalLight(0x4a90e2, 1.1);
    rimBackLeft.position.set(-6, 3, -10);
    this.threeScene.add(rimBackLeft);

    const rimBackRight = new THREE.DirectionalLight(0xdc143c, 1.5);
    rimBackRight.position.set(6, 4, -10);
    this.threeScene.add(rimBackRight);

    // ============================================================
    // 4. CARGA DEL MODELO ANATÓMICO 3D (anatomia.glb)
    // ============================================================
    this.humanModelGroup = new THREE.Group();
    this.humanModelGroup.position.set(0, 0.70, 0);
    this.threeScene.add(this.humanModelGroup);
    this.muscleMeshes = [];
    this.bodyMeshes = [];
    this.meshMuscleVertexIndices.clear();

    this.isLoading3DModel.set(true);

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/anatomia.glb',
      (gltf) => {
        const model = gltf.scene;

        // Centrado y escala normalizada para encuadre óptimo de cuerpo entero
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const targetHeight = 9.2;
        const scaleFactor = targetHeight / (size.y || 1.8);
        model.scale.setScalar(scaleFactor);
        model.position.set(
          -center.x * scaleFactor,
          -center.y * scaleFactor,
          -center.z * scaleFactor
        );

        const modelWrapper = new THREE.Group();
        modelWrapper.add(model);
        // Vista frontal directa hacia la cámara (pecho, abdomen, piernas y deltoides al frente)
        modelWrapper.rotation.y = 0;

        this.humanModelGroup?.add(modelWrapper);
        this.humanModelGroup?.updateMatrixWorld(true);

        const baseR = 0.08, baseG = 0.10, baseB = 0.13;
        const p = new THREE.Vector3();

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const geo = mesh.geometry;
            const pos = geo.attributes['position'];
            const count = pos.count;

            const colors = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
              colors[i * 3] = baseR;
              colors[i * 3 + 1] = baseG;
              colors[i * 3 + 2] = baseB;
            }
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            mesh.material = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              vertexColors: true,
              roughness: 0.30,
              metalness: 0.72,
              envMapIntensity: 1.0
            });
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.bodyMeshes.push(mesh);

            // Preclasificar índices de vértices por grupo muscular en espacio de mundo
            const muscleMap = new Map<string, number[]>();
            for (let i = 0; i < count; i++) {
              p.fromBufferAttribute(pos, i);
              mesh.localToWorld(p);

              for (const [mId, filterFn] of Object.entries(this.muscleFilters)) {
                if (filterFn(p)) {
                  let list = muscleMap.get(mId);
                  if (!list) {
                    list = [];
                    muscleMap.set(mId, list);
                  }
                  list.push(i);
                }
              }
            }
            this.meshMuscleVertexIndices.set(mesh, muscleMap);
          }
        });

        this.createMuscleColliders();
        this.isLoading3DModel.set(false);

        // Seleccionar Deltoides por defecto para coincidir exactamente con la imagen de referencia
        this.selectMuscle('deltoides');
      },
      undefined,
      (error) => {
        console.error('Error al cargar models/anatomia.glb:', error);
        this.isLoading3DModel.set(false);
      }
    );

    // ============================================================
    // 21. INTERACCIÓN CON MOUSE / RAYCASTING
    // ============================================================
    const domElement = this.threeRenderer.domElement;

    const onPointerMove = (e: MouseEvent) => {
      const rect = domElement.getBoundingClientRect();

      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      // Rotación manual por arrastre
      if (this.isDragging3D && this.humanModelGroup) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.dragDistance3D += Math.hypot(deltaX, deltaY);

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

      // Detección de músculo bajo el cursor
      if (this.threeCamera) {
        this.raycaster.setFromCamera(this.mouse, this.threeCamera);

        const intersects = this.raycaster.intersectObjects(
          this.muscleMeshes,
          false
        );

        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          const muscleId = hitMesh.userData['muscleId'];
          const info = muscleId ? this.musclesDatabase[muscleId] : null;
          const nombreEnEspanol = info?.nombre || hitMesh.userData['nombre'] || 'Músculo';

          domElement.style.cursor = 'pointer';
          this.hoveredMuscleName.set(nombreEnEspanol);

          if (muscleId && muscleId !== this.hoveredMuscleId) {
            this.hoveredMuscleId = muscleId;
            this.highlightMuscleOnModel(muscleId);
            this.updatePinPosition();
          }
        } else {
          domElement.style.cursor = this.isDragging3D ? 'grabbing' : 'grab';
          this.hoveredMuscleName.set(null);

          if (this.hoveredMuscleId !== null) {
            this.hoveredMuscleId = null;
            // Restaurar resaltado al músculo seleccionado o limpiar si no hay selección
            this.highlightMuscleOnModel(this.selectedMuscle()?.id || null);
            this.updatePinPosition();
          }
        }
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      this.isDragging3D = true;
      this.dragDistance3D = 0;
      this.previousMousePosition = {
        x: e.clientX,
        y: e.clientY
      };
      domElement.style.cursor = 'grabbing';
    };

    const onPointerUp = (e: MouseEvent) => {
      const isClick = this.dragDistance3D < 6;
      this.isDragging3D = false;
      domElement.style.cursor = 'grab';

      if (isClick && this.threeCamera) {
        const rect = domElement.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const clickY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

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
      this.hoveredMuscleName.set(null);
      if (this.hoveredMuscleId !== null) {
        this.hoveredMuscleId = null;
        this.highlightMuscleOnModel(this.selectedMuscle()?.id || null);
        this.updatePinPosition();
      }
    });
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // ============================================================
    // 22. ANIMACIÓN
    // ============================================================
    const animate = () => {
      this.threeAnimationId = requestAnimationFrame(animate);

      if (this.selectedMuscle() || this.hoveredMuscleId) {
        this.updatePinPosition();
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

  highlightMuscleOnModel(muscleId: string | null) {
    const baseR = 0.08, baseG = 0.10, baseB = 0.13;
    const glowR = 1.0, glowG = 0.08, glowB = 0.24;

    for (const mesh of this.bodyMeshes) {
      const colorAttr = mesh.geometry.attributes['color'] as THREE.BufferAttribute;
      if (!colorAttr) continue;
      const arr = colorAttr.array as Float32Array;
      const count = colorAttr.count;

      for (let i = 0; i < count; i++) {
        arr[i * 3] = baseR;
        arr[i * 3 + 1] = baseG;
        arr[i * 3 + 2] = baseB;
      }

      if (muscleId) {
        const map = this.meshMuscleVertexIndices.get(mesh);
        const indices = map?.get(muscleId);
        if (indices) {
          for (let j = 0; j < indices.length; j++) {
            const idx = indices[j];
            arr[idx * 3] = glowR;
            arr[idx * 3 + 1] = glowG;
            arr[idx * 3 + 2] = glowB;
          }
        }
      }

      colorAttr.needsUpdate = true;
    }
  }

  private updatePinPosition() {
    const activeId = this.hoveredMuscleId || this.selectedMuscle()?.id;
    const activeMuscle = activeId ? this.musclesDatabase[activeId] : null;
    const canvas = this.muscleCanvasRef?.nativeElement;
    if (!activeMuscle || !activeMuscle.anchor3D || !this.threeCamera || !canvas || !this.humanModelGroup) {
      this.pinScreenPos.set({ x: 0, y: 0, visible: false, label: '' });
      return;
    }

    const [ax, ay, az] = activeMuscle.anchor3D;
    const v = new THREE.Vector3(ax, ay, az);
    v.applyMatrix4(this.humanModelGroup.matrixWorld);
    v.project(this.threeCamera);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const shortLabel = activeMuscle.nombre.split(' ')[0];

    if (v.z > 1) {
      this.pinScreenPos.set({ x: 0, y: 0, visible: false, label: shortLabel });
      return;
    }

    const screenX = ((v.x + 1) * width) / 2;
    const screenY = ((-v.y + 1) * height) / 2;

    this.pinScreenPos.set({
      x: Math.round(screenX),
      y: Math.round(screenY),
      visible: true,
      label: shortLabel
    });
  }

  closeMusclePanel() {
    this.selectedMuscle.set(null);
    this.pinScreenPos.set({ x: 0, y: 0, visible: false, label: '' });
    this.highlightMuscleOnModel(null);
  }

  private createMuscleColliders() {
    if (!this.humanModelGroup) return;

    const addCollider = (
      geometry: THREE.BufferGeometry,
      muscleId: string,
      pos: [number, number, number],
      scale: [number, number, number] = [1, 1, 1],
      rot: [number, number, number] = [0, 0, 0]
    ) => {
      // Colisionadores estrictamente invisibles para raycasting sin renderizado geométrico
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(...pos);
      mesh.scale.set(...scale);
      mesh.rotation.set(...rot);

      mesh.userData = {
        muscleId,
        ...(this.musclesDatabase[muscleId] || {})
      };

      this.humanModelGroup?.add(mesh);
      this.muscleMeshes.push(mesh);
      return mesh;
    };

    // Trapecio
    addCollider(new THREE.ConeGeometry(1.4, 1.2, 32), 'trapecio', [0, 4.01, -0.34], [1.2, 1, 0.7]);

    // Pectorales
    const chestGeo = new THREE.SphereGeometry(0.75, 32, 32);
    addCollider(chestGeo, 'pectoral', [-0.56, 3.0, 0.45]);
    addCollider(chestGeo, 'pectoral', [0.56, 3.0, 0.45]);

    // Deltoides
    const deltGeo = new THREE.SphereGeometry(0.75, 32, 32);
    addCollider(deltGeo, 'deltoides', [-1.25, 3.32, -0.2]);
    addCollider(deltGeo, 'deltoides', [1.25, 3.32, -0.2]);

    // Bíceps
    const armGeo = new THREE.CapsuleGeometry(0.38, 0.9, 8, 24);
    addCollider(armGeo, 'biceps', [-1.35, 2.05, -0.2]);
    addCollider(armGeo, 'biceps', [1.35, 2.05, -0.2]);

    // Tríceps
    addCollider(armGeo, 'triceps', [-1.50, 2.25, -0.65]);
    addCollider(armGeo, 'triceps', [1.50, 2.25, -0.65]);

    // Abdominales / Core
    addCollider(new THREE.BoxGeometry(1.4, 1.5, 0.6), 'abs', [0, 1.49, 0.43]);

    // Dorsales
    const latGeo = new THREE.BoxGeometry(1.0, 1.5, 0.5);
    addCollider(latGeo, 'dorsal', [-0.94, 2.37, -0.46]);
    addCollider(latGeo, 'dorsal', [0.94, 2.37, -0.46]);

    // Lumbares
    addCollider(new THREE.SphereGeometry(0.75, 24, 24), 'lumbares', [0, 1.14, -0.33]);

    // Glúteos
    const gluteGeo = new THREE.SphereGeometry(0.75, 32, 32);
    addCollider(gluteGeo, 'gluteos', [-0.45, 0.38, -0.24]);
    addCollider(gluteGeo, 'gluteos', [0.45, 0.38, -0.24]);

    // Cuádriceps
    const quadGeo = new THREE.CapsuleGeometry(0.55, 1.8, 8, 24);
    addCollider(quadGeo, 'cuadriceps', [-0.53, -0.95, 0.25]);
    addCollider(quadGeo, 'cuadriceps', [0.53, -0.95, 0.25]);

    // Isquiotibiales
    addCollider(quadGeo, 'isquiotibiales', [-0.46, -1.09, -0.2]);
    addCollider(quadGeo, 'isquiotibiales', [0.46, -1.09, -0.2]);

    // Gemelos
    const calfGeo = new THREE.CapsuleGeometry(0.45, 1.5, 8, 24);
    addCollider(calfGeo, 'gemelos', [-0.44, -2.57, -0.23]);
    addCollider(calfGeo, 'gemelos', [0.44, -2.57, -0.23]);
  }

  private resetHoveredMesh() {
    this.hoveredMesh = null;
  }

  selectMuscle(muscleId: string) {
    if (this.musclesDatabase[muscleId]) {
      this.selectedMuscle.set(this.musclesDatabase[muscleId]);
      this.highlightMuscleOnModel(muscleId);
      this.updatePinPosition();
    }
  }

  resetModelRotation() {
    if (this.humanModelGroup) {
      this.humanModelGroup.rotation.set(0, 0, 0);
    }
    if (this.threeCamera) {
      this.threeCamera.position.set(0, 0.70, 18.0);
      this.threeCamera.lookAt(0, 0.70, 0);
    }
    this.updatePinPosition();
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