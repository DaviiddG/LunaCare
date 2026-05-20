import type { Part } from '@google/generative-ai';

// Detect if we're in local dev or production
const isLocalDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
);

// For local dev, we still use the client-side SDK for convenience
// For production, we route through the serverless function
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

const getSystemInstruction = (personality: 'serena' | 'activa', frequency: 'occasional' | 'balanced' | 'frequent') => {
    let personalityPrompt = "";
    if (personality === 'serena') {
        personalityPrompt = `
PERFIL DE PERSONALIDAD: NOCHE SERENA
- Rol: Consejera maternal nocturna de élite, experta en sueño infantil y tranquilidad familiar.
- Tono: Místico, sumamente calmado, dulce, poético y reconfortante.
- Lenguaje: Usa palabras suaves, tranquilizadoras y empáticas. Transmite paz absoluta. Eres como un faro de calma en medio de la noche.
- Enfoque: Prioriza el descanso, rutinas relajantes para dormir, calmar el llanto con amor, y brindar apoyo emocional profundo a los padres cansados.
`;
    } else {
        personalityPrompt = `
PERFIL DE PERSONALIDAD: DÍA ACTIVO
- Rol: Entrenadora proactiva de desarrollo infantil, juego motriz y alimentación estructurada.
- Tono: Dinámico, enérgico, entusiasta, alegre, motivador y estructurado.
- Lenguaje: Directo, animado y positivo. Inspira acción y organización.
- Enfoque: Planes de estimulación temprana, actividades sensoriales, hitos del desarrollo motor, recetas de sólidos y optimización del horario diario de forma eficiente.
`;
    }

    let frequencyPrompt = "";
    if (frequency === 'frequent') {
        frequencyPrompt = "FRECUENCIA DE CONSEJOS: Aprovecha cada oportunidad para dar consejos detallados y tips prácticos que puedan ayudar a los padres en su día a día.";
    } else if (frequency === 'occasional') {
        frequencyPrompt = "FRECUENCIA DE CONSEJOS: Sé sumamente discreta y directa. Solo ofrece consejos o tips si el usuario te lo pide explícitamente o si es de vital importancia.";
    } else {
        frequencyPrompt = "FRECUENCIA DE CONSEJOS: Mantén un balance saludable. Da consejos breves y oportunos únicamente cuando sea realmente relevante para la situación actual.";
    }

    return `Eres Luna, la IA experta de LunaCare, inspirada en la precisión y empatía de Huckleberry.
Tu propósito es guiar y apoyar a los padres en el cuidado de su bebé con un nivel de excelencia y calidez.

${personalityPrompt}

${frequencyPrompt}

TUS PILARES FUNDAMENTALES:
1. **Precisión Predictiva**: Utilizas "Ventanas de Sueño" (Wake Windows) basadas en la edad exacta del bebé en meses para aconsejar cuándo debe ser su próxima siesta:
   - 0-1 mes: 45-60 min
   - 1-2 meses: 60-90 min
   - 2-3 meses: 90-105 min
   - 3-4 meses: 105-120 min
   - 4-6 meses: 2-2.5 horas
   - 6-8 meses: 2.5-3 horas
   - 8-10 meses: 3-3.5 horas
   - 10-12 meses: 3-4 horas
2. **Copywriting Moderno**: Tu lenguaje es moderno, limpio, libre de sermones redundantes. Eres una aliada del usuario en su hermosa y caótica rutina de crianza.
3. **Proactividad Inteligente**: Cuando el usuario registre un sueño, comida o pañal usando lenguaje natural, felicítalo sutilmente u ofrece un pequeño tip motivador sin abrumar.
4. **Contexto de Múltiples Bebés**: Cada bebé tiene un perfil único. Presta atención al bebé seleccionado que está en el contexto del chat.
5. **Respuestas Cortas y Directas (Estilo Mensaje de Texto)**: Responde de forma breve y concisa. Evita discursos largos. Sé concisa y directa al punto como en un chat de WhatsApp de confianza, excepto cuando te soliciten explicaciones detalladas.

INSTRUCCIONES CLAVE DE FORMATO Y REGISTRO:
- NUNCA uses markdown (asteriscos **, negritas, itálicas) en tus mensajes normales. Habla en párrafos normales, limpios y fluidos. No parezcas un bot corporativo, sé extremadamente humana y natural.
- LLAMADAS A FUNCIONES (TOOLS): Tienes herramientas disponibles para registrar eventos del bebé en la base de datos (sueño, pañal, toma de pecho/fórmula, comida sólida, medicamentos, temperatura, crecimiento, actividades, etc.).
  - Si el usuario te indica que el bebé durmió, comió, hizo del baño, etc., debes LLAMAR a la función correspondiente inmediatamente para guardarlo en la base de datos.
  - Si el usuario te pide agregar a un bebé nuevo, debes LLAMAR a logAddBaby con los datos solicitados (nombre, fecha de nacimiento calculada, peso, altura).
  - Si falta algún dato requerido por la función, pídelo de manera dulce y amigable en tu respuesta de texto.
  - Si el usuario te pide borrar a un bebé, asegúrate de que te haya confirmado DOS VECES que está seguro antes de llamar a logDeleteBaby.

CONSEJOS DINÁMICOS: Si decides dar un tip o consejo útil al final de tu respuesta (de acuerdo a la frecuencia de consejos configurada), hazlo SIEMPRE en formato especial al final de tu mensaje (en líneas separadas y sin asteriscos):
TIP_TITLE: [Escribe aquí el título llamativo del tip]
TIP_CONTENT: [Escribe aquí la recomendación o tip en 1-2 oraciones cortas]
`;
};

/**
 * Send message via the Vercel serverless function (production)
 */
async function sendViaServerless(
    message: string,
    chatHistory: { role: 'user' | 'model'; parts: Part[] }[],
    babyContext: string,
    imageParts?: Part[],
    personality: 'serena' | 'activa' = 'serena',
    frequency: 'occasional' | 'balanced' | 'frequent' = 'balanced'
) {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message,
            chatHistory,
            babyContext,
            imageParts: imageParts || [],
            personality,
            frequency,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    const data = await response.json();
    return {
        text: data.text || null,
        actions: data.actions || [],
        error: data.error || null,
    };
}

/**
 * Send message via the client-side Gemini SDK (local dev only)
 */
async function sendViaClientSDK(
    message: string,
    chatHistory: { role: 'user' | 'model'; parts: Part[] }[],
    babyContext: string,
    imageParts?: Part[],
    personality: 'serena' | 'activa' = 'serena',
    frequency: 'occasional' | 'balanced' | 'frequent' = 'balanced'
) {
    const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction = getSystemInstruction(personality, frequency);

    const functionDeclarationsList = [
        {
            name: "logBabyDiet",
            description: "Registra una toma de alimento (pecho o biberón) para un bebé. Para sólidos usa logBabySolids.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    babyId: { type: SchemaType.STRING, description: "ID del bebé." },
                    type: { type: SchemaType.STRING, description: "Tipo: 'pecho', 'formula', 'mixta'" },
                    amount: { type: SchemaType.NUMBER, description: "ML o minutos." },
                    observations: { type: SchemaType.STRING, description: "Notas." },
                },
                required: ["babyId", "type", "amount"],
            },
        },
        {
            name: "logBabySolids",
            description: "Registra comida sólida (papillas, trozos, etc.).",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    babyId: { type: SchemaType.STRING, description: "ID del bebé." },
                    foods: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Lista de alimentos (ej: ['manzana', 'avena'])." },
                    amount: { type: SchemaType.STRING, description: "Cantidad (ej: 'media taza', '3 cucharadas')." },
                    observations: { type: SchemaType.STRING, description: "Notas." },
                },
                required: ["babyId", "foods"],
            },
        },
        {
            name: "logBabyDiaper",
            description: "Registra un cambio de pañal para un bebé.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    babyId: { type: SchemaType.STRING, description: "El ID del bebé." },
                    status: { type: SchemaType.STRING, description: "Estado del pañal: 'mojado', 'sucio', 'ambos' o 'seco'" },
                    observations: { type: SchemaType.STRING, description: "Observaciones adicionales." },
                },
                required: ["babyId", "status"],
            },
        },
        {
            name: "logBabySleep",
            description: "Registra que un bebé ha dormido.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    babyId: { type: SchemaType.STRING, description: "ID del bebé." },
                    durationMinutes: { type: SchemaType.NUMBER, description: "Minutos totales." },
                    observations: { type: SchemaType.STRING, description: "Notas." },
                },
                required: ["babyId", "durationMinutes"],
            },
        },
        {
            name: "logBabyMedicine",
            description: "Registra administración de medicamento.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    babyId: { type: SchemaType.STRING, description: "ID del bebé." },
                    name: { type: SchemaType.STRING, description: "Nombre del medicamento." },
                    dosage: { type: SchemaType.STRING, description: "Dosis." },
                    observations: { type: SchemaType.STRING, description: "Notas." },
                },
                required: ["babyId", "name"],
            },
        },
        {
            name: "logBabyGrowth",
            description: "Registra peso, altura o perímetro cefálico.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    babyId: { type: SchemaType.STRING, description: "ID del bebé." },
                    weight: { type: SchemaType.NUMBER, description: "Peso en kg." },
                    height: { type: SchemaType.NUMBER, description: "Altura en cm." },
                    headCircumference: { type: SchemaType.NUMBER, description: "Perímetro cefálico en cm." },
                },
                required: ["babyId"],
            },
        },
        {
            name: "logBabyTemperature",
            description: "Registra temperatura corporal.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    babyId: { type: SchemaType.STRING, description: "ID del bebé." },
                    temperature: { type: SchemaType.NUMBER, description: "Valor (ej: 37.5)." },
                    unit: { type: SchemaType.STRING, description: "C o F." },
                },
                required: ["babyId", "temperature"],
            },
        },
        {
            name: "logBabyActivity",
            description: "Registra tiempo boca abajo, juegos, etc.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    babyId: { type: SchemaType.STRING, description: "ID del bebé." },
                    activityType: { type: SchemaType.STRING, description: "Tipo de actividad." },
                    durationMinutes: { type: SchemaType.NUMBER, description: "Duración en minutos." },
                    observations: { type: SchemaType.STRING, description: "Notas." },
                },
                required: ["babyId", "activityType"],
            },
        },
        {
            name: "logAddBaby",
            description: "Agrega un nuevo perfil de bebé para el usuario.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING, description: "Nombre del nuevo bebé." },
                    gender: { type: SchemaType.STRING, description: "Género del bebé: 'niño' o 'niña'" },
                    birthDate: { type: SchemaType.STRING, description: "Fecha de nacimiento en formato YYYY-MM-DD." },
                    weight: { type: SchemaType.NUMBER, description: "Peso del bebé al nacer en kg." },
                    height: { type: SchemaType.NUMBER, description: "Altura del bebé al nacer en cm." },
                },
                required: ["name", "weight", "height"],
            },
        },
        {
            name: "logUpdateBaby",
            description: "Actualiza el peso o la altura actual de un bebé existente.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    babyId: { type: SchemaType.STRING, description: "El ID del bebé que se va a actualizar." },
                    weight: { type: SchemaType.NUMBER, description: "Nuevo peso del bebé en kg." },
                    height: { type: SchemaType.NUMBER, description: "Nueva altura del bebé en cm." },
                },
                required: ["babyId"],
            },
        },
        {
            name: "logDeleteBaby",
            description: "Elimina el perfil de un bebé y TODOS sus historiales.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    babyId: { type: SchemaType.STRING, description: "El ID del bebé que se va a eliminar." },
                },
                required: ["babyId"],
            },
        },
    ];

    const dynamicModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction,
        tools: [
            {
                functionDeclarations: functionDeclarationsList as any,
            },
        ],
    });

    const chat = dynamicModel.startChat({
        history: chatHistory,
    });

    const prompt = `
[CONTEXTO DEL SISTEMA INVISIBLE PARA EL USUARIO, USA ESTA INFO PARA RESPONDER]
- Estado actual del bebé en la BD:
${babyContext}
- FIN DEL CONTEXTO --

Mensaje del usuario:
${message}
    `.trim();

    const promptParts: Part[] = [
        { text: prompt }
    ];

    if (imageParts && imageParts.length > 0) {
        promptParts.push(...imageParts);
    }

    const result = await chat.sendMessage(promptParts);

    const functionCalls = result.response.functionCalls();
    const actions = functionCalls || [];

    let responseText = "";
    try {
        responseText = result.response.text();
    } catch (e) {
        try {
            const candidates = result.response.candidates;
            if (candidates && candidates.length > 0) {
                const parts = candidates[0]?.content?.parts || [];
                responseText = parts
                    .filter((p: any) => p.text)
                    .map((p: any) => p.text)
                    .join('');
            }
        } catch (e2) {
            console.warn('No se pudo extraer texto de candidatos:', e2);
        }
    }

    return { text: responseText, actions, error: null };
}

export const geminiHelpers = {
    /**
     * Envía un mensaje a Luna con todo el contexto del bebé y el historial del chat.
     * En producción usa la serverless function, en local usa el SDK directo.
     */
    async sendMessageWithContext(
        message: string,
        chatHistory: { role: 'user' | 'model'; parts: Part[] }[],
        babyContext: string,
        imageParts?: Part[],
        personality: 'serena' | 'activa' = 'serena',
        frequency: 'occasional' | 'balanced' | 'frequent' = 'balanced'
    ) {
        try {
            if (isLocalDev && apiKey) {
                // Local development: use client SDK directly
                return await sendViaClientSDK(message, chatHistory, babyContext, imageParts, personality, frequency);
            } else {
                // Production: use serverless function
                return await sendViaServerless(message, chatHistory, babyContext, imageParts, personality, frequency);
            }
        } catch (error: any) {
            console.error("Error en gemini:", error);
            return { text: null, actions: [], error: error.message };
        }
    }
};
