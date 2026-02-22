import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType, type Part } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY no está definida en las variables de entorno.");
}

// Inicializar el cliente
const genAI = new GoogleGenerativeAI(apiKey || "");

const logBabyDietDeclaration: FunctionDeclaration = {
    name: "logBabyDiet",
    description: "Registra una toma de alimento para un bebé específico. Ejecuta esto ÚNICAMENTE cuando se solicite o confirme explícitamente haber alimentado a un bebé del hogar.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            babyId: { type: SchemaType.STRING, description: "El ID del bebé al que se le aplicará el registro. Búscalo en el contexto." },
            type: { type: SchemaType.STRING, description: "Tipo de alimentación: 'pecho', 'formula', 'mixta' u 'otros'" },
            amount: { type: SchemaType.NUMBER, description: "Cantidad en mililitros (ml) si es fórmula o biberón, o minutos si es pecho." },
            observations: { type: SchemaType.STRING, description: "Observaciones adicionales si las hay (vacío si no hay)." },
        },
        required: ["babyId", "type", "amount"],
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
    description: "Registra que un bebé ha dormido. Úsalo cuando te digan el nombre del bebé y el tiempo que durmió.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            babyId: { type: SchemaType.STRING, description: "El ID del bebé al que se le aplicará el registro. Búscalo en el contexto." },
            durationMinutes: { type: SchemaType.NUMBER, description: "Duración en minutos totales de cuánto durmió." },
            observations: { type: SchemaType.STRING, description: "Observaciones sobre cómo durmió (vacío si no hay)." },
        },
        required: ["babyId", "durationMinutes"],
    },
};

// Configuración general del modelo
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `Eres Luna, una asesora empática, experta y cariñosa en pediatría temprana y maternidad/paternidad. 
Tu objetivo es ayudar, tranquilizar y aconsejar a los padres y madres.
Reglas:
1. Sé cálida, empática y conversacional, como una amiga pediatra respondiendo en WhatsApp. Usa emojis sutilmente.
2. Basarás tus respuestas en la información de TODOS los bebés (hijos) del padre actual que se te proporcionará en el contexto. El usuario puede tener uno o varios gemelos/hijos de distintas edades.
3. CRÍTICO: Si el usuario te PIde registrar algo (ej. "durmió 1 hora" o "cambié un pañal") pero NO MENCIONA a cuál de sus bebés se refiere, y en su contexto hay MÁS DE UN BEBÉ, **DEBES preguntarle amablemente a cuál bebé se refiere** antes de usar las funciones. Si solo tiene un bebé o menciona su nombre claramente ("Sof tomó 10 min"), obtén el "babyId" del contexto y llama a la función correspondiente.
4. Siempre enfatiza que tus consejos no reemplazan a un médico.`,
    tools: [
        {
            functionDeclarations: [logBabyDietDeclaration, logBabyDiaperDeclaration, logBabySleepDeclaration],
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

            // Check if model decided to call a function
            const functionCalls = result.response.functionCalls();
            const action = functionCalls ? functionCalls[0] : null;

            // Extract text if there is any
            let responseText = "";
            try {
                responseText = result.response.text();
            } catch (e) {
                // Ignore, means there is no text part, only function call
            }

            return { text: responseText, action, error: null };
        } catch (error: any) {
            console.error("Error en gemini:", error);
            return { text: null, action: null, error: error.message };
        }
    }
};
