export interface ExerciseInfo {
  name: string;
  desc: string;
  level: string;
  series: string;
  reps: string;
  media: string;
}

export interface MuscleInfo {
  id: string;
  name: string;
  description: string;
  function: string;
  exercises: ExerciseInfo[];
}
