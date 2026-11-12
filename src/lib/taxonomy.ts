/** Traducciones fijas del dataset free-exercise-db al español. */

export const MUSCLES: Record<string, string> = {
  abdominals: "Abdominales",
  abductors: "Abductores",
  adductors: "Aductores",
  biceps: "Bíceps",
  calves: "Pantorrillas",
  chest: "Pecho",
  forearms: "Antebrazos",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiales",
  lats: "Dorsales",
  "lower back": "Zona lumbar",
  "middle back": "Espalda media",
  neck: "Cuello",
  quadriceps: "Cuádriceps",
  shoulders: "Hombros",
  traps: "Trapecios",
  triceps: "Tríceps",
};

export const EQUIPMENT: Record<string, string> = {
  bands: "Bandas elásticas",
  barbell: "Barra",
  "body only": "Peso corporal",
  cable: "Polea",
  dumbbell: "Mancuernas",
  "e-z curl bar": "Barra Z",
  "exercise ball": "Pelota de ejercicio",
  "foam roll": "Rodillo de espuma",
  kettlebells: "Pesa rusa",
  machine: "Máquina",
  "medicine ball": "Pelota medicinal",
  other: "Otro",
};

export const LEVELS: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  expert: "Avanzado",
};

export const CATEGORIES: Record<string, string> = {
  cardio: "Cardio",
  "olympic weightlifting": "Halterofilia",
  plyometrics: "Pliometría",
  powerlifting: "Powerlifting",
  strength: "Fuerza",
  stretching: "Estiramiento",
  strongman: "Strongman",
};

export const MUSCLE_VALUES = Object.values(MUSCLES);
export const EQUIPMENT_VALUES = Object.values(EQUIPMENT);
export const LEVEL_VALUES = Object.values(LEVELS);

export function translate(map: Record<string, string>, value: string | null | undefined): string | null {
  if (!value) return null;
  return map[value] ?? null;
}

export function translateMany(map: Record<string, string>, values: string[]): string[] {
  return values.map((v) => map[v]).filter((v): v is string => Boolean(v));
}
