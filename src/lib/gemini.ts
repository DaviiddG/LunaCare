import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is not set in the environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export interface LunaContext {
    recentFeeds: any[];
    recentSleeps: any[];
    recentCries: any[];
}

export async function chatWithLuna(
    query: string,
    context: LunaContext,
    history: { role: string, content: string }[] = [],
    babyProfile?: { name: string, birth_date?: string, weight_kg?: number, feeding_type?: string }
): Promise<string> {
    if (!apiKey) {
        return "Lo siento, necesito mi clave de acceso para hablar contigo. Configura VITE_GEMINI_API_KEY.";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const historyText = history.length > 0
            ? `\nHistorial Reciente:\n${history.map(h => `${h.role === 'user' ? 'Mamá' : 'Luna'}: ${h.content}`).join('\n')}`
            : '';

        const babyInfo = babyProfile
            ? `\nPerfil del bebé (${babyProfile.name}): ${babyProfile.birth_date ? `Nacido el ${babyProfile.birth_date}, ` : ''}${babyProfile.weight_kg ? `pesa ${babyProfile.weight_kg}kg, ` : ''}${babyProfile.feeding_type ? `toma ${babyProfile.feeding_type}.` : ''}`
            : '';

        const contextInfo = `
Registro Reciente:
- Últimas Comidas: ${context.recentFeeds.length > 0 ? context.recentFeeds.map(f => `${f.food_type} (${new Date(f.created_at).toLocaleTimeString()})`).join(', ') : 'Ninguna registrada pronto.'}
- Últimos Sueños: ${context.recentSleeps.length > 0 ? context.recentSleeps.map(s => `(${new Date(s.created_at).toLocaleTimeString()})`).join(', ') : 'Ninguno registrado pronto.'}
- Episodios de Llanto: ${context.recentCries.length > 0 ? context.recentCries.map(c => `(${new Date(c.created_at).toLocaleTimeString()})`).join(', ') : 'Ninguno registrado pronto.'}
        `;

        const prompt = `Eres Luna, una asistente inteligente, empática y experta para la aplicación LunaCare.
Tu objetivo AHORA MISMO es calmar a una madre primeriza, interpretar posibles razones por las que su bebé llora y ofrecer soluciones claras y reconfortantes.
Tu personalidad: Mamá experta, calmada, no alarmista, muy empática ("yo sé lo que se siente"). Nunca juzgas.
        ${babyInfo}
        ${contextInfo}
        ${historyText}
        
INSTRUCCIONES CRÍTICAS:
1. SI El BEBÉ LLORA: Usa el "Registro Reciente" para adivinar por qué. ¿Comió hace más de 3 hrs? Hambre. ¿Lleva despierto mucho tiempo? Sueño.
2. VALIDA LAS EMOCIONES: Siempre empieza validando ("Es normal sentirse abrumada, respira", "No estás haciendo nada mal").
3. SÉ BREVE: Las respuestas deben ser cortas (máximo 3 párrafos cortos). La mamá puede estar con un bebé llorando en brazos.
4. Usa emojis suavemente para transmitir calma (✨, 🌙, 🤍).

Mensaje de la mamá: "${query}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error in Luna chat:", error);
        return "Lo siento mamá, mi conexión está un poco inestable. ¡Respira profundo, lo estás haciendo excelente! Intenta escribirme en un momento. ✨";
    }
}

