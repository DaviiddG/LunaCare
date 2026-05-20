import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY is not defined in environment variables');
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    try {
        const { message, chatHistory, babyContext, imageParts, personality, frequency } = req.body;

        const systemInstruction = getSystemInstruction(
            personality || 'serena',
            frequency || 'balanced'
        );

        // Build the request body for Gemini REST API
        const contents: any[] = [];

        // Add chat history
        if (chatHistory && chatHistory.length > 0) {
            for (const msg of chatHistory) {
                contents.push({
                    role: msg.role,
                    parts: msg.parts
                });
            }
        }

        // Add the current user message with context
        const prompt = `
[CONTEXTO DEL SISTEMA INVISIBLE PARA EL USUARIO, USA ESTA INFO PARA RESPONDER]
- Estado actual del bebé en la BD:
${babyContext}
- FIN DEL CONTEXTO --

Mensaje del usuario:
${message}
        `.trim();

        const userParts: any[] = [{ text: prompt }];

        if (imageParts && imageParts.length > 0) {
            for (const img of imageParts) {
                userParts.push({
                    inlineData: {
                        data: img.inlineData.data,
                        mimeType: img.inlineData.mimeType
                    }
                });
            }
        }

        contents.push({
            role: 'user',
            parts: userParts
        });

        const geminiRequestBody = {
            contents,
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            tools: [
                {
                    functionDeclarations: getFunctionDeclarations()
                }
            ],
            generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            }
        };

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(geminiRequestBody),
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Gemini API error:', geminiResponse.status, errorText);
            return res.status(geminiResponse.status).json({
                error: `Gemini API error: ${geminiResponse.status}`,
                details: errorText
            });
        }

        const geminiData = await geminiResponse.json();

        // Parse the response
        let responseText = '';
        const actions: any[] = [];

        if (geminiData.candidates && geminiData.candidates.length > 0) {
            const candidate = geminiData.candidates[0];
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.text) {
                        responseText += part.text;
                    }
                    if (part.functionCall) {
                        actions.push({
                            name: part.functionCall.name,
                            args: part.functionCall.args
                        });
                    }
                }
            }
        }

        return res.status(200).json({
            text: responseText,
            actions,
            error: null
        });

    } catch (error: any) {
        console.error('Server error in chat handler:', error);
        return res.status(500).json({
            text: null,
            actions: [],
            error: error.message || 'Internal server error'
        });
    }
}

function getSystemInstruction(personality: 'serena' | 'activa', frequency: 'occasional' | 'balanced' | 'frequent'): string {
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
}

function getFunctionDeclarations() {
    return [
        {
            name: "logBabyDiet",
            description: "Registra una toma de alimento (pecho o biberón) para un bebé. Para sólidos usa logBabySolids.",
            parameters: {
                type: "OBJECT",
                properties: {
                    babyId: { type: "STRING", description: "ID del bebé." },
                    type: { type: "STRING", description: "Tipo: 'pecho', 'formula', 'mixta'" },
                    amount: { type: "NUMBER", description: "ML o minutos." },
                    observations: { type: "STRING", description: "Notas." },
                },
                required: ["babyId", "type", "amount"],
            },
        },
        {
            name: "logBabySolids",
            description: "Registra comida sólida (papillas, trozos, etc.).",
            parameters: {
                type: "OBJECT",
                properties: {
                    babyId: { type: "STRING", description: "ID del bebé." },
                    foods: { type: "ARRAY", items: { type: "STRING" }, description: "Lista de alimentos (ej: ['manzana', 'avena'])." },
                    amount: { type: "STRING", description: "Cantidad (ej: 'media taza', '3 cucharadas')." },
                    observations: { type: "STRING", description: "Notas." },
                },
                required: ["babyId", "foods"],
            },
        },
        {
            name: "logBabyDiaper",
            description: "Registra un cambio de pañal para un bebé. Úsalo cuando el usuario te indique que acaba de cambiar un pañal.",
            parameters: {
                type: "OBJECT",
                properties: {
                    babyId: { type: "STRING", description: "El ID del bebé al que se le aplicará el registro. Búscalo en el contexto." },
                    status: { type: "STRING", description: "Estado del pañal: 'mojado', 'sucio', 'ambos' o 'seco'" },
                    observations: { type: "STRING", description: "Observaciones adicionales (vacío si no hay)." },
                },
                required: ["babyId", "status"],
            },
        },
        {
            name: "logBabySleep",
            description: "Registra que un bebé ha dormido.",
            parameters: {
                type: "OBJECT",
                properties: {
                    babyId: { type: "STRING", description: "ID del bebé." },
                    durationMinutes: { type: "NUMBER", description: "Minutos totales." },
                    observations: { type: "STRING", description: "Notas." },
                },
                required: ["babyId", "durationMinutes"],
            },
        },
        {
            name: "logBabyMedicine",
            description: "Registra administración de medicamento.",
            parameters: {
                type: "OBJECT",
                properties: {
                    babyId: { type: "STRING", description: "ID del bebé." },
                    name: { type: "STRING", description: "Nombre del medicamento." },
                    dosage: { type: "STRING", description: "Dosis (ej: '2.5ml', '1 gota')." },
                    observations: { type: "STRING", description: "Notas." },
                },
                required: ["babyId", "name"],
            },
        },
        {
            name: "logBabyGrowth",
            description: "Registra peso, altura o perímetro cefálico.",
            parameters: {
                type: "OBJECT",
                properties: {
                    babyId: { type: "STRING", description: "ID del bebé." },
                    weight: { type: "NUMBER", description: "Peso en kg." },
                    height: { type: "NUMBER", description: "Altura en cm." },
                    headCircumference: { type: "NUMBER", description: "Perímetro cefálico en cm." },
                },
                required: ["babyId"],
            },
        },
        {
            name: "logBabyTemperature",
            description: "Registra temperatura corporal.",
            parameters: {
                type: "OBJECT",
                properties: {
                    babyId: { type: "STRING", description: "ID del bebé." },
                    temperature: { type: "NUMBER", description: "Valor (ej: 37.5)." },
                    unit: { type: "STRING", description: "C o F." },
                },
                required: ["babyId", "temperature"],
            },
        },
        {
            name: "logBabyActivity",
            description: "Registra tiempo boca abajo, juegos, etc.",
            parameters: {
                type: "OBJECT",
                properties: {
                    babyId: { type: "STRING", description: "ID del bebé." },
                    activityType: { type: "STRING", description: "Tipo de actividad." },
                    durationMinutes: { type: "NUMBER", description: "Duración en minutos." },
                    observations: { type: "STRING", description: "Notas." },
                },
                required: ["babyId", "activityType"],
            },
        },
        {
            name: "logAddBaby",
            description: "Agrega un nuevo perfil de bebé para el usuario. Úsalo cuando el usuario te pida explícitamente agregar o registrar a un nuevo hijo.",
            parameters: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING", description: "Nombre del nuevo bebé." },
                    gender: { type: "STRING", description: "Género del bebé: 'niño' o 'niña'" },
                    birthDate: { type: "STRING", description: "Fecha de nacimiento en formato YYYY-MM-DD. Si solo dice hoy, calcula la fecha actual." },
                    weight: { type: "NUMBER", description: "Peso del bebé al nacer en kg (ej: 3.5). Requerido al agregar." },
                    height: { type: "NUMBER", description: "Altura del bebé al nacer en cm (ej: 50). Requerido al agregar." },
                },
                required: ["name", "weight", "height"],
            },
        },
        {
            name: "logUpdateBaby",
            description: "Actualiza el peso o la altura actual de un bebé existente. Úsalo cuando te informen cuánto pesa o mide AHORA un bebé específico.",
            parameters: {
                type: "OBJECT",
                properties: {
                    babyId: { type: "STRING", description: "El ID del bebé que se va a actualizar. Búscalo en el contexto." },
                    weight: { type: "NUMBER", description: "Nuevo peso del bebé en kg (ej: 4.2). Vacío si no informan peso." },
                    height: { type: "NUMBER", description: "Nueva altura del bebé en cm (ej: 55). Vacío si no informan altura." },
                },
                required: ["babyId"],
            },
        },
        {
            name: "logDeleteBaby",
            description: "Elimina el perfil de un bebé y TODOS sus historiales. Ejecuta esto ÚNICAMENTE si el usuario ya te confirmó DOS VECES que está absolutamente seguro de borrar a este bebé.",
            parameters: {
                type: "OBJECT",
                properties: {
                    babyId: { type: "STRING", description: "El ID del bebé que se va a eliminar. Búscalo en el contexto." },
                },
                required: ["babyId"],
            },
        },
    ];
}
