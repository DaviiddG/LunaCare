import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType, type Part } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY no está definida en las variables de entorno.");
}

// Inicializar el cliente
const genAI = new GoogleGenerativeAI(apiKey || "");

const logBabyDietDeclaration: FunctionDeclaration = {
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
};

const logBabySolidsDeclaration: FunctionDeclaration = {
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
};

const logBabyDiaperDeclaration: FunctionDeclaration = {
    name: "logBabyDiaper",
    description: "Registra un cambio de pañal para un bebé. Úsalo cuando el usuario te indique que acaba de cambiar un pañal.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            babyId: { type: SchemaType.STRING, description: "El ID del bebé al que se le aplicará el registro. Búscalo en el contexto." },
            status: { type: SchemaType.STRING, description: "Estado del pañal: 'mojado', 'sucio', 'ambos' o 'seco'" },
            observations: { type: SchemaType.STRING, description: "Observaciones adicionales (vacío si no hay)." },
        },
        required: ["babyId", "status"],
    },
};

const logBabySleepDeclaration: FunctionDeclaration = {
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
};

const logBabyMedicineDeclaration: FunctionDeclaration = {
    name: "logBabyMedicine",
    description: "Registra administración de medicamento.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            babyId: { type: SchemaType.STRING, description: "ID del bebé." },
            name: { type: SchemaType.STRING, description: "Nombre del medicamento." },
            dosage: { type: SchemaType.STRING, description: "Dosis (ej: '2.5ml', '1 gota')." },
            observations: { type: SchemaType.STRING, description: "Notas." },
        },
        required: ["babyId", "name"],
    },
};

const logBabyGrowthDeclaration: FunctionDeclaration = {
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
};

const logBabyTemperatureDeclaration: FunctionDeclaration = {
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
};

const logBabyActivityDeclaration: FunctionDeclaration = {
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
};

const logAddBabyDeclaration: FunctionDeclaration = {
    name: "logAddBaby",
    description: "Agrega un nuevo perfil de bebé para el usuario. Úsalo cuando el usuario te pida explícitamente agregar o registrar a un nuevo hijo.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            name: { type: SchemaType.STRING, description: "Nombre del nuevo bebé." },
            gender: { type: SchemaType.STRING, description: "Género del bebé: 'niño' o 'niña'" },
            birthDate: { type: SchemaType.STRING, description: "Fecha de nacimiento en formato YYYY-MM-DD. Si solo dice hoy, calcula la fecha actual." },
            weight: { type: SchemaType.NUMBER, description: "Peso del bebé al nacer en kg (ej: 3.5). Requerido al agregar." },
            height: { type: SchemaType.NUMBER, description: "Altura del bebé al nacer en cm (ej: 50). Requerido al agregar." },
        },
        required: ["name", "weight", "height"],
    },
};

const logUpdateBabyDeclaration: FunctionDeclaration = {
    name: "logUpdateBaby",
    description: "Actualiza el peso o la altura actual de un bebé existente. Úsalo cuando te informen cuánto pesa o mide AHORA un bebé específico.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            babyId: { type: SchemaType.STRING, description: "El ID del bebé que se va a actualizar. Búscalo en el contexto." },
            weight: { type: SchemaType.NUMBER, description: "Nuevo peso del bebé en kg (ej: 4.2). Vacío si no informan peso." },
            height: { type: SchemaType.NUMBER, description: "Nueva altura del bebé en cm (ej: 55). Vacío si no informan altura." },
        },
        required: ["babyId"],
    },
};

const logDeleteBabyDeclaration: FunctionDeclaration = {
    name: "logDeleteBaby",
    description: "Elimina el perfil de un bebé y TODOS sus historiales. Ejecuta esto ÚNICAMENTE si el usuario ya te confirmó DOS VECES que está absolutamente seguro de borrar a este bebé.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            babyId: { type: SchemaType.STRING, description: "El ID del bebé que se va a eliminar. Búscalo en el contexto." },
        },
        required: ["babyId"],
    },
};

// Configuración general del modelo
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Eres Luna, la IA experta de LunaCare, inspirada en la precisión y empatía de Huckleberry. 
Tu personalidad es la de una Consultora de Sueño y Desarrollo Infantil de élite: altamente profesional, basada en datos, pero profundamente cálida y tranquilizadora.

Tus pilares fundamentales son:
1. **Precisión Predictiva**: Utilizas "Ventanas de Sueño" (Wake Windows) para aconsejar. 
   - 0-1 mes: 45-60 min
   - 1-2 meses: 60-90 min
   - 2-3 meses: 90-105 min
   - 3-4 meses: 105-120 min
   - 4-6 meses: 2-2.5 horas
   - 6-8 meses: 2.5-3 horas
   - 8-10 meses: 3-3.5 horas
2. **Copywriting "Berry"**: Tu lenguaje es limpio, moderno y reconfortante. Evitas los sermones. Eres una aliada en la "hermosa caótica rutina".
3. **Proactividad**: No solo respondes, anticipas. Si registran un sueño, menciona cuándo podría ser la próxima ventana (SweetSpot).
4. **Contexto de Múltiples Bebés**: Manejas a cada bebé con su perfil único. Si no especifican a quién, pregunta con dulzura.
5. **Respuestas ultra-cortas y directas**: Debes responder de la manera más breve posible, yendo directo al punto. No des largas explicaciones a menos que te lo pidan. Ejemplo de tono: en vez de decir "¡Qué bueno que durmió! ¿Me puedes decir a qué hora empezó y terminó el sueño?", di directamente: "¿A qué hora comenzó y terminó la sesión de sueño de tu hijo?". Muestra tu empatía en el tono de experta, pero mantén las interacciones similares a mensajes de texto rápidos.

Reglas de Operación:
- DOBLE CONFIRMACIÓN para borrar perfiles.
- LLAMADAS PARALELAS para acciones múltiples.
- Siempre recordatorio sutil: "Mis consejos no sustituyen al pediatra".`,
    tools: [
        {
            functionDeclarations: [
                logBabyDietDeclaration,
                logBabySolidsDeclaration,
                logBabyDiaperDeclaration,
                logBabySleepDeclaration,
                logBabyMedicineDeclaration,
                logBabyGrowthDeclaration,
                logBabyTemperatureDeclaration,
                logBabyActivityDeclaration,
                logAddBabyDeclaration,
                logDeleteBabyDeclaration,
                logUpdateBabyDeclaration
            ],
        },
    ],
});

export const geminiHelpers = {
    /**
     * Envía un mensaje a Luna con todo el contexto del bebé y el historial del chat.
     */
    async sendMessageWithContext(
        message: string,
        chatHistory: { role: 'user' | 'model'; parts: Part[] }[],
        babyContext: string
    ) {
        try {
            const chat = model.startChat({
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

            const result = await chat.sendMessage(prompt);

            // Check if model decided to call a function (can be multiple parallel calls)
            const functionCalls = result.response.functionCalls();
            const actions = functionCalls || [];

            // Extract text if there is any
            let responseText = "";
            try {
                responseText = result.response.text();
            } catch (e) {
                // Ignore, means there is no text part, only function call
            }

            return { text: responseText, actions, error: null };
        } catch (error: any) {
            console.error("Error en gemini:", error);
            return { text: null, actions: [], error: error.message };
        }
    }
};
