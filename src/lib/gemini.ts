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
        const prompt = `Eres Luna, una asistente inteligente, dulce y servicial para una aplicaci├│n de cuidado de beb├⌐s llamada LunaCare. 
        Tu objetivo es dar consejos cortos, ├║tiles y reconfortantes a las mam├ís basados en la actividad reciente del beb├⌐. 
        Contexto del beb├⌐ hoy: ${context}
        Escribe un consejo de m├íximo 2 oraciones, usa un tono cari├▒oso y empoderador. No uses lenguaje t├⌐cnico aburrido.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating AI advice:", error);
        return "No pude conectar con el consejero IA en este momento. Intenta m├ís tarde.";
    }
}

export async function chatWithLuna(
    query: string,
    context: string,
    history: { role: string, content: string }[] = [],
    babyProfile?: { name: string, birth_date?: string, weight?: number, height?: number }
): Promise<string> {
    if (!apiKey) {
        return "Lo siento, necesito mi clave de acceso para hablar contigo. Configura VITE_GEMINI_API_KEY.";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const historyText = history.length > 0
            ? `\nHistorial de nuestra conversaci├│n anterior:\n${history.map(h => `${h.role === 'user' ? 'Mam├í' : 'Luna'}: ${h.content}`).join('\n')}`
            : '';

        const babyInfo = babyProfile
            ? `\nInformaci├│n del beb├⌐ (${babyProfile.name}): ${babyProfile.birth_date ? `Nacido el ${babyProfile.birth_date}, ` : ''}${babyProfile.weight ? `pesa ${babyProfile.weight}kg, ` : ''}${babyProfile.height ? `mide ${babyProfile.height}cm.` : ''}`
            : '';

        const prompt = `Eres Luna, una asistente inteligente, dulce, emp├ítica y muy servicial para LunaCare.
        Tu personalidad es como la de una hada madrina moderna o una amiga experta en beb├⌐s.
        
        ${babyInfo}
        
        Contexto actual de la app (registros de hoy): ${context}
        ${historyText}
        
        Instrucciones:
        1. Responde de forma natural y conversacional. El usuario est├í hablando contigo, as├¡ que s├⌐ breve pero c├ílida.
        2. Si te preguntan algo sobre los datos (ej: "┬┐cu├índo comi├│?"), consulta el contexto de hoy.
        3. Si te preguntan algo que mencionaron antes, consulta el historial.
        4. Mant├⌐n las respuestas breves y reconfortantes (m├íximo 2-3 oraciones).
        5. Usa emojis ocasionalmente para ser m├ís amigable.

        Mensaje de la mam├í: "${query}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error in Luna chat:", error);
        return "Lo siento, mi conexi├│n m├ígica ha fallado un momento. Γ£¿ ┬┐Podr├¡as intentar dec├¡rmelo de nuevo?";
    }
}

