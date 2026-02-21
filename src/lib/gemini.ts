import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is not set in the environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function getBabyCareAdvice(context: string): Promise<string> {
    if (!apiKey) {
        return "Falta configurar la clave de API de Gemini (VITE_GEMINI_API_KEY).";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Eres Luna, una asistente inteligente, dulce y servicial para una aplicación de cuidado de bebés llamada LunaCare. 
        Tu objetivo es dar consejos cortos, útiles y reconfortantes a las mamás basados en la actividad reciente del bebé. 
        Contexto del bebé hoy: ${context}
        Escribe un consejo de máximo 2 oraciones, usa un tono cariñoso y empoderador. No uses lenguaje técnico aburrido.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating AI advice:", error);
        return "No pude conectar con el consejero IA en este momento. Intenta más tarde.";
    }
}

export async function chatWithLuna(query: string, context: string): Promise<string> {
    if (!apiKey) {
        return "Lo siento, necesito mi clave de acceso para hablar contigo. Configura VITE_GEMINI_API_KEY.";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Eres Luna, una asistente inteligente, dulce, empática y muy servicial para LunaCare.
        Tu personalidad es como la de una hada madrina moderna o una amiga experta en bebés.
        
        Contexto actual de la app (registros de hoy): ${context}
        
        Instrucciones:
        1. Responde de forma natural y conversacional. El usuario está hablando contigo por voz, así que sé breve.
        2. Si te preguntan algo sobre los datos (ej: "¿cuándo comió?"), consulta el contexto proporcionado.
        3. Si no sabes algo, responde con dulzura pero honestidad.
        4. Mantén las respuestas muy breves y reconfortantes (máximo 2 oraciones).
        5. Usa emojis ocasionalmente para ser más amigable.

        Mensaje de la mamá: "${query}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error in Luna chat:", error);
        return "Perdona, me he distraído un momento. ¿Podrías repetirme eso?";
    }
}
