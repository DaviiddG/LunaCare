import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY no está definida en las variables de entorno.");
}

// Inicializar el cliente
const genAI = new GoogleGenerativeAI(apiKey || "");

// Configuración general del modelo
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: `Eres Luna, una asesora empática, experta y cariñosa en pediatría temprana y maternidad/paternidad. 
Tu objetivo es ayudar, tranquilizar y aconsejar a los padres y madres.
Háblales usando el rol que te definan (Papá o Mamá) y conéctate con ellos de manera personal.
Reglas:
1. Sé cálida, empática y directa. No des respuestas gigantes y robóticas, usa emojis sutilmente.
2. Basarás tus respuestas SÓLO en el contexto reciente del bebé que se te entregue (comidas, sueño, pañales).
3. Si los datos sugieren que tiene hambre (ej. más de 3h sin comer un recién nacido), sugiérelo suavemente.
4. Siempre enfatiza que tus consejos no reemplazan a un profesional médico.
5. Intenta ser muy conversacional, como una amiga pediatra respondiendo en WhatsApp.`,
});

export const geminiHelpers = {
    /**
     * Envía un mensaje a Luna con todo el contexto del bebé y el historial del chat.
     */
    async sendMessageWithContext(
        message: string,
        chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[],
        babyContext: string
    ) {
        try {
            // Se inicia un chat mandando el historial previo para recordar conversaciones
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
            const responseText = result.response.text();

            return { text: responseText, error: null };
        } catch (error: any) {
            console.error("Error en gemini:", error);
            return { text: null, error: error.message };
        }
    }
};
