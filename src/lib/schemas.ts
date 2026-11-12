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

/** Clasificación de una búsqueda nueva (alta bajo demanda). */
export const resolveSchema = z.object({
  isExercise: z.boolean().describe("true solo si es un ejercicio físico real y reconocible"),
  nameEs: z.string().describe("Nombre canónico en español"),
  nameEn: z.string().describe("Nombre canónico en inglés"),
  aliases: z.array(z.string()).max(6),
  primaryMuscles: z.array(z.string()).max(4),
  secondaryMuscles: z.array(z.string()).max(4),
  equipment: z.string().nullable(),
  level: z.string().nullable(),
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
