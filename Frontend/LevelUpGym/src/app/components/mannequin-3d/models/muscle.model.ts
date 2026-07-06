import { MuscleInfo } from '../interfaces/mannequin.interface';

export const DEFAULT_MUSCLES: MuscleInfo[] = [
  {
    id: 'pectoralis',
    name: 'Pectorales',
    description: 'Los pectorales son un grupo muscular grande que cubre la parte anterior del pecho.',
    function: 'Son responsables de la aducción y rotación interna del hombro.',
    exercises: [
      { name: 'Press de banca', desc: 'Empuja la barra verticalmente acostado en banco plano.', level: 'Intermedio', series: '4', reps: '8-12', media: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&q=80' },
      { name: 'Press inclinado', desc: 'Trabajo con enfoque en la parte superior del pecho.', level: 'Intermedio', series: '4', reps: '8-12', media: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80' },
      { name: 'Aperturas con mancuernas', desc: 'Movimiento de aislamiento para estirar las fibras pectorales.', level: 'Principiante', series: '3', reps: '10-15', media: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=200&q=80' }
    ]
  },
  {
    id: 'deltoids',
    name: 'Deltoides',
    description: 'Músculo del hombro con tres cabezas principales: anterior, lateral y posterior.',
    function: 'Eleva el brazo y proporciona estabilidad a la articulación del hombro.',
    exercises: [
      { name: 'Press militar', desc: 'Empuje vertical con barra de pie o sentado.', level: 'Intermedio', series: '4', reps: '8-10', media: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&q=80' },
      { name: 'Elevaciones laterales', desc: 'Aislamiento de la cabeza lateral del deltoides.', level: 'Principiante', series: '4', reps: '12-15', media: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=200&q=80' }
    ]
  },
  {
    id: 'biceps',
    name: 'Bíceps',
    description: 'Músculo de dos cabezas ubicado en la parte anterior del brazo.',
    function: 'Flexiona el codo y supina el antebrazo.',
    exercises: [
      { name: 'Curl con barra', desc: 'Flexión de codo clásica de pie.', level: 'Principiante', series: '4', reps: '10-12', media: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&q=80' },
      { name: 'Curl martillo', desc: 'Sostiene mancuernas con agarre neutro.', level: 'Principiante', series: '3', reps: '12', media: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=200&q=80' }
    ]
  },
  {
    id: 'triceps',
    name: 'Tríceps',
    description: 'Músculo de tres cabezas situado en la parte posterior del brazo.',
    function: 'Extensor principal del antebrazo en la articulación del codo.',
    exercises: [
      { name: 'Fondos en paralelas', desc: 'Baja el cuerpo usando tu propio peso y empuja hacia arriba.', level: 'Avanzado', series: '3', reps: '8-12', media: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80' },
      { name: 'Copas a una mano', desc: 'Extensión tras nuca con mancuerna.', level: 'Principiante', series: '3', reps: '12', media: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=200&q=80' }
    ]
  },
  {
    id: 'forearms',
    name: 'Antebrazos',
    description: 'Músculos flexores y extensores ubicados en la parte inferior del brazo.',
    function: 'Permite flexionar la muñeca y otorga fuerza de agarre.',
    exercises: [
      { name: 'Curl invertido', desc: 'Curl de bíceps con agarre prono.', level: 'Principiante', series: '3', reps: '12-15', media: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=200&q=80' }
    ]
  },
  {
    id: 'trapezius',
    name: 'Trapecios',
    description: 'Músculo plano y grande que se extiende desde el cuello hasta la mitad de la espalda.',
    function: 'Eleva, rota y retrae la escápula.',
    exercises: [
      { name: 'Encogimientos con barra', desc: 'Eleva los hombros verticalmente con barra pesada.', level: 'Principiante', series: '4', reps: '12-15', media: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=200&q=80' }
    ]
  },
  {
    id: 'lats',
    name: 'Dorsales',
    description: 'Dorsal ancho, el músculo más grande de la parte superior del cuerpo.',
    function: 'Tracción de los brazos hacia el torso y aducción.',
    exercises: [
      { name: 'Dominadas', desc: 'Eleva tu propio cuerpo colgado de una barra.', level: 'Avanzado', series: '4', reps: '8-10', media: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=200&q=80' },
      { name: 'Jalón al pecho', desc: 'Polea alta jalando la barra hacia el pecho superior.', level: 'Principiante', series: '4', reps: '10-12', media: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&q=80' }
    ]
  },
  {
    id: 'midback',
    name: 'Espalda media',
    description: 'Compuesta por romboides y redondo mayor/menor.',
    function: 'Retracción escapular y densidad de la espalda.',
    exercises: [
      { name: 'Remo con barra', desc: 'Remo inclinado jalando la barra hacia la cintura.', level: 'Intermedio', series: '4', reps: '8-12', media: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80' }
    ]
  },
  {
    id: 'lowerback',
    name: 'Lumbares',
    description: 'Erectores espinales situados a los lados de la columna lumbar.',
    function: 'Extensión y estabilización lumbar.',
    exercises: [
      { name: 'Peso muerto', desc: 'Levantamiento olímpico del suelo con barra.', level: 'Avanzado', series: '4', reps: '5', media: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&q=80' }
    ]
  },
  {
    id: 'abs',
    name: 'Abdominales',
    description: 'Recto abdominal, encargado del aspecto visual de la tableta.',
    function: 'Flexiona la columna y comprime las vísceras abdominales.',
    exercises: [
      { name: 'Crunches', desc: 'Elevación de hombros acostado boca arriba.', level: 'Principiante', series: '4', reps: '15-20', media: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&q=80' }
    ]
  },
  {
    id: 'obliques',
    name: 'Oblicuos',
    description: 'Músculos laterales del abdomen situados a los lados del recto abdominal.',
    function: 'Rotación y flexión lateral de la columna.',
    exercises: [
      { name: 'Giros rusos', desc: 'Sentado con pies elevados, gira el torso de lado a lado.', level: 'Intermedio', series: '3', reps: '20', media: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&q=80' }
    ]
  },
  {
    id: 'glutes',
    name: 'Glúteos',
    description: 'Glúteo mayor, medio y menor conformando la zona posterior de la cadera.',
    function: 'Extensión, abducción y rotación externa de la cadera.',
    exercises: [
      { name: 'Hip thrust', desc: 'Empuje de cadera apoyando la espalda en banco.', level: 'Intermedio', series: '4', reps: '10-12', media: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=200&q=80' }
    ]
  },
  {
    id: 'quads',
    name: 'Cuádriceps',
    description: 'Músculo frontal de cuatro cabezas del muslo.',
    function: 'Extiende la rodilla y flexiona la cadera.',
    exercises: [
      { name: 'Sentadillas', desc: 'Flexión profunda de rodillas con barra sobre los hombros.', level: 'Intermedio', series: '4', reps: '8-12', media: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80' }
    ]
  },
  {
    id: 'hamstrings',
    name: 'Isquiotibiales',
    description: 'Músculos de la parte posterior del muslo.',
    function: 'Flexionan la rodilla y extienden la cadera.',
    exercises: [
      { name: 'Peso muerto rumano', desc: 'Descenso controlado de barra con rodillas casi rectas.', level: 'Intermedio', series: '4', reps: '10', media: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&q=80' }
    ]
  },
  {
    id: 'adductors',
    name: 'Aductores',
    description: 'Grupo de músculos en la parte interna del muslo.',
    function: 'Aducen la pierna (aproximan hacia el eje central).',
    exercises: [
      { name: 'Aductores en polea', desc: 'Aducción de pierna de pie con cable.', level: 'Principiante', series: '3', reps: '12', media: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=200&q=80' }
    ]
  },
  {
    id: 'calves',
    name: 'Pantorrillas',
    description: 'Gastrocnemio y sóleo situados en la parte posterior inferior de la pierna.',
    function: 'Flexión plantar del pie.',
    exercises: [
      { name: 'Elevación de talones', desc: 'Elevación sobre escalón con mancuernas o barra.', level: 'Principiante', series: '4', reps: '15-20', media: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&q=80' }
    ]
  }
];
