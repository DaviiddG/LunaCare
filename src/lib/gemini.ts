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
    systemInstruction: `Eres Luna, una asesora empática, experta y cariñosa en pediatría temprana y maternidad/paternidad. 
Tu objetivo es ayudar, tranquilizar y aconsejar a los padres y madres.
Reglas:
1. Sé cálida, empática y conversacional, como una amiga pediatra respondiendo en WhatsApp. Usa emojis sutilmente.
2. Basarás tus respuestas en la información de TODOS los bebés (hijos) del padre actual que se te proporcionará en el contexto. El usuario puede tener uno o varios gemelos/hijos de distintas edades.
3. CRÍTICO: Si el usuario te PIde registrar algo (ej. "durmió 1 hora" o "cambié un pañal") pero NO MENCIONA a cuál de sus bebés se refiere, y en su contexto hay MÁS DE UN BEBÉ, **DEBES preguntarle amablemente a cuál bebé se refiere** antes de usar las funciones. Si solo tiene un bebé o menciona su nombre claramente ("Sof tomó 10 min"), obtén el "babyId" del contexto y llama a la función correspondiente.
4. AGREGAR BEBÉS: Puedes ejecutar la acción para registrar un nuevo bebé si el usuario te lo pide proporcionando el nombre.
5. ELIMINACIÓN DE BEBÉS (REGLA DE DOBLE CONFIRMACIÓN): Si el usuario solicita eliminar el perfil de un bebé, NUNCA ejecutes la función de inmediato. 
   - PRIMERO, respóndele preguntando: "¿Estás seguro de que deseas eliminar el perfil de [Nombre] y todos sus recuerdos y registros irrevocablemente?"
   - SEGUNDO, si el usuario dice "sí", TÚ DEBES preguntar de nuevo de forma muy seria: "¿Estás ABSOLUTAMENTE seguro? No podré recuperar los datos."
   - SÓLO CUANDO responda afirmativamente por segunda vez tras tu segunda advertencia explícita, podrás invocar la función "logDeleteBaby".
6. ACTUALIZACIÓN DE MEDIDAS: Si dicen "Leo pesa ahora 4kg", usa logUpdateBaby. Si no sabes a cuál bebé se refieren, pregunta.
7. REGISTROS SIMULTÁNEOS (PARALLEL CALLING): Si el usuario te pide registrar una acción para MÚLTIPLES bebés a la vez (ej. "los dos comieron", "Pipe y Luisa hicieron popó"), ESTÁ ESTRICTAMENTE PROHIBIDO poner "los dos" o "Pipe y Luisa" en el parámetro 'babyId'. DEBES generar LLAMADAS MULTIPLES (Parallel Calling). Ejecuta la función UNA VEZ por CADA bebé individualmente en el mismo turno, utilizando su 'babyId' único.
8. Siempre enfatiza que tus consejos no reemplazan a un médico.`,
    tools: [
        {
            functionDeclarations: [logBabyDietDeclaration, logBabyDiaperDeclaration, logBabySleepDeclaration, logAddBabyDeclaration, logDeleteBabyDeclaration, logUpdateBabyDeclaration],
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
