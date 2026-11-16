import { generateText, Output, type LanguageModel } from "ai";
import type { z } from "zod";
import { config } from "./config";
import {
  alternativesBatchSchema,
  exerciseContentSchema,
  groupScanByDay,
  resolveSchema,
  routineScanSchema,
  translationBatchSchema,
  type ExerciseContent,
  type RoutineScan,
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
// Ejercicios alternativos (seed:alternatives)

export interface AlternativesInput {
  id: string;
  nameEs: string;
  nameEn: string;
  equipment: string | null;
  muscles: string[];
}

export async function suggestAlternatives(items: AlternativesInput[]) {
  if (config.aiProvider === "mock") {
    return { items: items.map((i) => ({ id: i.id, alternatives: [] as { nameEs: string; nameEn: string }[] })) };
  }
  const system = `Sos entrenador personal. Para cada ejercicio de gimnasio, sugerí 4 ejercicios alternativos que trabajen
lo mismo con un movimiento equivalente pero con OTRO equipamiento (por ejemplo, de polea a mancuernas, de máquina a barra,
de barra a mancuernas, o con el propio peso). Sirven para cuando la máquina está ocupada o no hay ese equipamiento.
Reglas:
- Ejercicios comunes y conocidos, ordenados del más parecido al menos parecido.
- No repitas el mismo ejercicio ni variantes con el mismo equipamiento.
- Si es un estiramiento o cardio, sugerí otros del mismo tipo.
- Devolvé exactamente un item por cada id recibido, con el mismo id.`;
  const prompt = items
    .map(
      (i) =>
        `${i.id} | ${i.nameEs} (${i.nameEn}) | equipamiento: ${i.equipment ?? "?"} | músculos: ${i.muscles.join(", ") || "?"}`,
    )
    .join("\n");
  return generate(alternativesBatchSchema, system, prompt);
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
      equipment: "",
      level: "",
    };
  }
  const system = `Recibís lo que un usuario escribió en el buscador de una app de ejercicios de gimnasio.
Decidí si es un ejercicio físico real y reconocible (isExercise). Si no lo es, devolvé isExercise=false y el resto vacío.
Si lo es, devolvé su nombre canónico en español (como se dice en Argentina) y en inglés, alias comunes y su clasificación.
Músculos: usá solo valores de esta lista: ${MUSCLE_VALUES.join(", ")}.
Equipamiento: uno de: ${EQUIPMENT_VALUES.join(", ")}, o vacío.
Nivel: uno de: ${LEVEL_VALUES.join(", ")}, o vacío.`;
  return generate(resolveSchema, system, `Búsqueda: "${query}"`);
}

// ---------------------------------------------------------------------------
// Rutina desde una foto o captura de pantalla

const SCAN_SYSTEM = `Leés fotos y capturas de pantalla de rutinas de gimnasio (planillas, apps, notas, pizarras) escritas en español.
Devolvé todos los ejercicios en el orden en que aparecen; en "day" va el título del día al que pertenece cada uno.
Reglas:
- Cada título tipo "Día 3", "Lunes", "Rutina A" o "Piernas" abre un día nuevo. Usá ese texto, igual para todos sus ejercicios.
- Si arriba de todo hay ejercicios antes del primer título visible (la captura empieza a mitad de un día), su day es "(sin título)".
- Incluí los bloques de abdominales u otros que estén dentro del día, como ejercicios más.
- name: el nombre tal como está escrito, sin series ni repeticiones ni aclaraciones entre paréntesis.
- nameEs: el nombre más común en gimnasios de Argentina. nameEn: el nombre en inglés usado en bases de ejercicios
  (por ejemplo "sillón de cuádriceps" -> "Leg Extensions", "gemelos en máquina parado" -> "Standing Calf Raises",
  "cortitos superiores" -> "Crunches", "prensa 90 grados" -> "Vertical Leg Press").
- sets: solo el número de series. reps: repeticiones compactas ("15 a 10" -> "15-10", "4x30" -> sets "4" y reps "30").
- sets, reps o notes que no figuren: texto vacío "".
- notes: aclaraciones o alternativas que figuren en el texto, resumidas.
- No inventes ejercicios que no estén en la imagen. Si la imagen no es una rutina, devolvé exercises vacío.`;

export async function extractRoutineFromImage(image: Uint8Array, mediaType: string): Promise<RoutineScan> {
  if (config.aiProvider === "mock") return mockScan();
  const model = await getModel();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { output } = await generateText({
        model,
        temperature: 0.1,
        system: SCAN_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extraé la rutina de esta imagen." },
              { type: "file", data: image, mediaType },
            ],
          },
        ],
        output: Output.object({ schema: routineScanSchema }),
      });
      return groupScanByDay(routineScanSchema.parse(output));
    } catch (error) {
      lastError = error;
      // Un 400 no se arregla reintentando.
      if ((error as { statusCode?: number }).statusCode === 400) break;
    }
  }
  throw lastError;
}

function mockScan(): RoutineScan {
  return {
    days: [
      {
        label: "Día 3",
        exercises: [
          { name: "Sentadillas c/barra", nameEs: "Sentadilla con barra", nameEn: "Barbell Squat", sets: "5", reps: "15-10", notes: "" },
          { name: "Sillón de cuádriceps", nameEs: "Extensión de cuádriceps", nameEn: "Leg Extensions", sets: "4", reps: "15-10", notes: "" },
        ],
      },
    ],
  };
}
