import { generateText, Output, type LanguageModel } from "ai";
import type { z } from "zod";
import { config } from "./config";
import {
  exerciseContentSchema,
  resolveSchema,
  translationBatchSchema,
  type ExerciseContent,
} from "./schemas";
import { EQUIPMENT_VALUES, LEVEL_VALUES, MUSCLE_VALUES } from "./taxonomy";

/**
 * Toda llamada a IA pasa por este archivo. El proveedor se elige con
 * AI_PROVIDER (google por defecto) y el modelo con AI_MODEL.
 * Con AI_PROVIDER=mock no se llama a ninguna API: se usa en los tests.
 */

export function aiConfigured(): boolean {
  if (config.aiProvider === "mock") return true;
  if (config.aiProvider === "google") return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  return false;
}

async function getModel(): Promise<LanguageModel> {
  if (config.aiProvider === "google") {
    const { google } = await import("@ai-sdk/google");
    return google(config.aiModel);
  }
  throw new Error(`Proveedor de IA no soportado: ${config.aiProvider}`);
}

export function modelLabel(): string {
  return `${config.aiProvider}:${config.aiModel}`;
}

async function generate<T extends z.ZodType>(schema: T, system: string, prompt: string): Promise<z.infer<T>> {
  const model = await getModel();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { output } = await generateText({
        model,
        temperature: 0.3,
        system,
        prompt,
        output: Output.object({ schema }),
      });
      return schema.parse(output);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Ficha del ejercicio

export interface ContentInput {
  nameEs: string;
  nameEn: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructionsEn: string[];
}

const CONTENT_SYSTEM = `Sos un entrenador personal que escribe fichas de ejercicios para una app en español rioplatense (Argentina).
Reglas:
- Español claro y directo, con voseo ("apoyá", "bajá"). Sin jerga innecesaria.
- Basate en las instrucciones originales cuando existan y no las contradigas.
- No inventes cargas, series, repeticiones ni promesas de resultados. No des consejo médico.
- Cada error común incluye por qué es un problema y cómo corregirlo.
- En "musclesWorked": entre 1 y 5 músculos, al menos uno "principal", coherentes con los músculos indicados.
  Cada músculo con su nombre común ("Hombros, parte frontal") y el técnico ("Deltoides anterior"),
  y una explicación simple de qué hace en el movimiento y para qué sirve fortalecerlo.
  Indicá "intensity" de 1 a 5 según cuánto participa (5 = protagonista).
- Entre 4 y 8 pasos, entre 3 y 6 recomendaciones y entre 3 y 6 errores comunes.`;

export async function generateExerciseContent(input: ContentInput): Promise<ExerciseContent> {
  if (config.aiProvider === "mock") return mockContent(input);
  const prompt = [
    `Ejercicio: ${input.nameEs} (en inglés: ${input.nameEn})`,
    input.equipment ? `Equipamiento: ${input.equipment}` : null,
    input.primaryMuscles.length ? `Músculos principales: ${input.primaryMuscles.join(", ")}` : null,
    input.secondaryMuscles.length ? `Músculos secundarios: ${input.secondaryMuscles.join(", ")}` : null,
    input.instructionsEn.length
      ? `Instrucciones originales (inglés):\n${input.instructionsEn.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : null,
    "Escribí la ficha completa.",
  ]
    .filter(Boolean)
    .join("\n");
  return generate(exerciseContentSchema, CONTENT_SYSTEM, prompt);
}

function mockContent(input: ContentInput): ExerciseContent {
  const muscle = input.primaryMuscles[0] ?? "Músculo principal";
  return {
    summary: `Ficha de prueba para ${input.nameEs}. Contenido generado por el proveedor simulado.`,
    musclesWorked: {
      overview: `Trabaja principalmente ${muscle.toLowerCase()}. Texto de prueba.`,
      muscles: [
        { name: muscle, technicalName: muscle, role: "principal", intensity: 5, explanation: "Explicación de prueba del músculo." },
        { name: "Tríceps", technicalName: "Tríceps braquial", role: "secundario", intensity: 2, explanation: "Explicación de prueba del secundario." },
      ],
    },
    steps: ["Paso de prueba uno.", "Paso de prueba dos.", "Paso de prueba tres.", "Paso de prueba cuatro."],
    tips: ["Recomendación de prueba uno.", "Recomendación de prueba dos.", "Recomendación de prueba tres."],
    commonMistakes: [
      { mistake: "Error de prueba", why: "Motivo de prueba.", fix: "Corrección de prueba." },
      { mistake: "Otro error", why: "Otro motivo.", fix: "Otra corrección." },
      { mistake: "Tercer error", why: "Tercer motivo.", fix: "Tercera corrección." },
    ],
    safetyNote: "Aviso de prueba.",
  };
}

// ---------------------------------------------------------------------------
// Traducción de nombres (seed)

export async function translateNames(items: { id: string; name: string; equipment: string | null }[]) {
  if (config.aiProvider === "mock") {
    return { items: items.map((i) => ({ id: i.id, nameEs: i.name, aliases: [] as string[] })) };
  }
  const system = `Traducís nombres de ejercicios de gimnasio del inglés al español usado en Argentina y Latinoamérica.
Usá el nombre que se dice en un gimnasio real (por ejemplo "Barbell Squat" -> "Sentadilla con barra", "Pullups" -> "Dominadas",
"Arnold Dumbbell Press" -> "Press Arnold"). En aliases poné otras formas comunes de llamarlo, incluido el nombre en inglés si se usa.
Devolvé exactamente un item por cada id recibido, con el mismo id.`;
  const prompt = items.map((i) => `${i.id} | ${i.name}${i.equipment ? ` | ${i.equipment}` : ""}`).join("\n");
  return generate(translationBatchSchema, system, prompt);
}

// ---------------------------------------------------------------------------
// Alta bajo demanda

export async function classifyQuery(query: string) {
  if (config.aiProvider === "mock") {
    const isExercise = !/^(asdf|hola|pizza)/i.test(query);
    return {
      isExercise,
      nameEs: query,
      nameEn: query,
      aliases: [],
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment: null,
      level: null,
    };
  }
  const system = `Recibís lo que un usuario escribió en el buscador de una app de ejercicios de gimnasio.
Decidí si es un ejercicio físico real y reconocible (isExercise). Si no lo es, devolvé isExercise=false y el resto vacío.
Si lo es, devolvé su nombre canónico en español (como se dice en Argentina) y en inglés, alias comunes y su clasificación.
Músculos: usá solo valores de esta lista: ${MUSCLE_VALUES.join(", ")}.
Equipamiento: uno de: ${EQUIPMENT_VALUES.join(", ")}, o null.
Nivel: uno de: ${LEVEL_VALUES.join(", ")}, o null.`;
  return generate(resolveSchema, system, `Búsqueda: "${query}"`);
}
