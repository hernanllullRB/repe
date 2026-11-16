import { z } from "zod";

/** Ficha generada por la IA. Se valida al escribir y al leer. */
export const muscleWorkedSchema = z.object({
  name: z.string().min(2).describe('Nombre común en español, por ejemplo "Hombros, parte frontal"'),
  technicalName: z.string().min(2).describe('Nombre técnico, por ejemplo "Deltoides anterior"'),
  role: z.enum(["principal", "secundario"]),
  intensity: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe("Cuánto participa en el movimiento, de 1 (poco) a 5 (es el protagonista)"),
  explanation: z
    .string()
    .min(10)
    .describe("Qué hace este músculo en el movimiento y para qué sirve fortalecerlo, en 1 o 2 oraciones simples"),
});

export const exerciseContentSchema = z.object({
  summary: z.string().min(10).describe("Qué es el ejercicio y para qué sirve, en 1 o 2 oraciones"),
  musclesWorked: z.object({
    overview: z.string().min(10).describe("Qué entrena en general y qué se gana con eso, en 1 o 2 oraciones"),
    muscles: z.array(muscleWorkedSchema).min(1).max(5),
  }),
  steps: z.array(z.string().min(5)).min(3).max(8),
  tips: z.array(z.string().min(5)).min(2).max(6),
  commonMistakes: z
    .array(
      z.object({
        mistake: z.string().min(3).describe("Qué se hace mal"),
        why: z.string().min(5).describe("Por qué es un problema"),
        fix: z.string().min(5).describe("Cómo corregirlo"),
      }),
    )
    .min(2)
    .max(6),
  safetyNote: z.string().min(5).describe("Aviso breve de seguridad"),
});

export type ExerciseContent = z.infer<typeof exerciseContentSchema>;
export type MuscleWorked = z.infer<typeof muscleWorkedSchema>;

/** Traducción de nombres del seed. */
export const translationBatchSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      nameEs: z.string().min(2).describe("Nombre más usado en gimnasios de Argentina y Latinoamérica"),
      aliases: z.array(z.string()).max(6).describe("Otras formas de llamarlo, en español o inglés"),
    }),
  ),
});

/** Alternativas sugeridas por la IA (seed:alternatives). Sin maxItems: Gemini da 400 con topes altos. */
export const alternativesBatchSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      alternatives: z.array(
        z.object({
          nameEs: z.string().describe("Nombre del ejercicio alternativo como se dice en gimnasios de Argentina"),
          nameEn: z.string().describe('Nombre en inglés como en bases de ejercicios, por ejemplo "Dumbbell Flyes"'),
        }),
      ),
    }),
  ),
});

/** Clasificación de una búsqueda nueva (alta bajo demanda). */
export const resolveSchema = z.object({
  isExercise: z.boolean().describe("true solo si es un ejercicio físico real y reconocible"),
  nameEs: z.string().describe("Nombre canónico en español"),
  nameEn: z.string().describe("Nombre canónico en inglés"),
  aliases: z.array(z.string()).max(6),
  primaryMuscles: z.array(z.string()).max(4),
  secondaryMuscles: z.array(z.string()).max(4),
  // Gemini rechaza los campos que pueden ser null ("type": ["string","null"]): vacío = sin dato.
  equipment: z.string().describe("Equipamiento, o vacío si no aplica"),
  level: z.string().describe("Nivel, o vacío si no se sabe"),
});

/** Entrada de data/overrides.json. */
export const overrideSchema = z.object({
  nameEs: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  youtubeVideoId: z.string().optional(),
  images: z.array(z.string()).optional(),
});
export const overridesFileSchema = z.record(z.string(), overrideSchema);
export type Override = z.infer<typeof overrideSchema>;

/** Registro del dataset free-exercise-db. */
export const datasetExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  force: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
  mechanic: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  instructions: z.array(z.string()),
  category: z.string().nullable().optional(),
  images: z.array(z.string()),
});
export type DatasetExercise = z.infer<typeof datasetExerciseSchema>;

// ---------------------------------------------------------------------------
// Rutinas guardadas en la base

const routineId = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);

export const routineItemSchema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  image: z.string().max(500).nullable(),
  sets: z.string().max(20).optional(),
  reps: z.string().max(30).optional(),
});
export type RoutineItemData = z.infer<typeof routineItemSchema>;

/** Cuerpo de PUT /api/routines/[id]. */
export const routineBodySchema = z.object({
  name: z.string().trim().min(1).max(60),
  items: z.array(routineItemSchema).max(60),
  done: z.array(z.string().max(120)).max(60),
  doneDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  /** Milisegundos desde 1970 de la última vez que se completó. */
  lastCompletedAt: z.number().int().positive().nullable().optional(),
});

/** Cuerpo de POST /api/routines/import (rutinas del navegador al iniciar sesión). */
export const routineImportSchema = z.object({
  routines: z.array(routineBodySchema.extend({ id: routineId })).max(50),
});

export function isRoutineId(id: string): boolean {
  return routineId.safeParse(id).success;
}

// ---------------------------------------------------------------------------
// Lectura de una rutina a partir de una foto o captura

/**
 * Lo que devuelve la IA: una lista plana de ejercicios, cada uno con el día al
 * que pertenece. Gemini rechaza (400 "invalid argument") los esquemas con una
 * esquemas con maxItems altos o campos null, así que el tope y la agrupación
 * por día se hacen en el código.
 */
export const routineScanSchema = z.object({
  exercises: z
    .array(
      z.object({
        day: z
          .string()
          .describe('Título del día al que pertenece, tal como aparece ("Día 3"). Si no tiene título visible, "(sin título)"'),
        name: z.string().describe("Nombre del ejercicio tal como está escrito, sin series ni repeticiones"),
        nameEs: z
          .string()
          .describe('Nombre canónico en español de Argentina, por ejemplo "Extensión de cuádriceps en máquina"'),
        nameEn: z.string().describe('Nombre canónico en inglés como en bases de ejercicios, por ejemplo "Leg Extensions"'),
        // Sin .nullable(): Gemini tampoco acepta "type": ["string","null"]. Vacío = sin dato.
        sets: z.string().describe('Cantidad de series, solo el número: "4". Vacío si no figura'),
        reps: z.string().describe('Repeticiones compactas: "15-10", "12", "30", "20". Vacío si no figura'),
        notes: z.string().describe("Aclaraciones del texto (variantes, alternativas), breve. Vacío si no hay"),
      }),
    ),
  // Sin .max(): un maxItems alto también da 400 en Gemini. El tope se aplica en groupScanByDay.
});
export type RoutineScanRaw = z.infer<typeof routineScanSchema>;

export type ScannedExercise = Omit<RoutineScanRaw["exercises"][number], "day">;
export interface RoutineScan {
  days: { label: string; exercises: ScannedExercise[] }[];
}

export const MAX_SCANNED_EXERCISES = 120;

/** Agrupa la lista plana por día, respetando el orden en que aparecen. */
export function groupScanByDay(raw: RoutineScanRaw): RoutineScan {
  const days: RoutineScan["days"] = [];
  for (const { day, ...ex } of raw.exercises.slice(0, MAX_SCANNED_EXERCISES)) {
    const label = day.trim() || "(sin título)";
    const last = days[days.length - 1];
    const target = last && last.label === label ? last : days.find((d) => d.label === label);
    if (target) target.exercises.push(ex);
    else days.push({ label, exercises: [ex] });
  }
  return { days };
}
