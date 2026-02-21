import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
// Note: In a real app, you'd want to call this from a backend to hide the API key.
// But for this MVP frontend-only phase as requested, it's called here.
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Eres una pediatra experta y consejera amigable para madres primerizas. 
    A continuación te doy un resumen reciente del día de mi bebé. 
    Dame un consejo o comentario cálido y útil de máximo 2 oraciones.
    Resumen del día: ${context}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating AI advice:", error);
        return "No pude conectar con el consejero IA en este momento. Intenta más tarde.";
    }
}
