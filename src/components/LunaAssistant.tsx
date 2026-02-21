import { useState, useEffect, useRef } from 'react';
import { chatWithLuna } from '../lib/gemini';
import { supabase } from '../lib/supabase';
import { Sparkles, Mic, MicOff, X, Volume2, VolumeX } from 'lucide-react';

// Types for Web Speech API
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: (event: any) => void;
    onerror: (event: any) => void;
    onend: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export function LunaAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const [appContext, setAppContext] = useState('');
    const [textQuery, setTextQuery] = useState('');

    useEffect(() => {
        // Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            if (recognitionRef.current) {
                recognitionRef.current.continuous = false;
                recognitionRef.current.lang = 'es-ES';

                recognitionRef.current.onresult = (event: any) => {
                    const currentTranscript = event.results[0][0].transcript;
                    setTranscript(currentTranscript);
                    handleLunaQuery(currentTranscript);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }

        // Fetch initial context
        fetchAppContext();
    }, []);

    const fetchAppContext = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [diets, diapers, sleep] = await Promise.all([
            supabase.from('diets').select('*').eq('user_id', session.user.id).gte('created_at', today.toISOString()).order('created_at', { ascending: false }).limit(3),
            supabase.from('diapers').select('*').eq('user_id', session.user.id).gte('created_at', today.toISOString()).order('created_at', { ascending: false }).limit(3),
            supabase.from('sleep_logs').select('*').eq('user_id', session.user.id).gte('created_at', today.toISOString()).order('created_at', { ascending: false }).limit(3)
        ]);

        const contextString = `
            Comidas recientes: ${diets.data?.map(d => `${d.type} (${d.amount || 'N/A'})`).join(', ') || 'Ninguna aún'}.
            Pañales recientes: ${diapers.data?.map(d => d.status).join(', ') || 'Ninguno aún'}.
            Sueño hoy: ${sleep.data?.length || 0} sesiones registradas.
        `;
        setAppContext(contextString);
    };

    const handleLunaQuery = async (query: string) => {
        setIsLoading(true);
        // Refresh context before each query to ensure real-time accuracy
        await fetchAppContext();
        const result = await chatWithLuna(query, appContext);
        setResponse(result);
        setIsLoading(false);
        if (!isMuted) {
            speak(result);
        }
    };

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!textQuery.trim()) return;
        setTranscript(textQuery);
        handleLunaQuery(textQuery);
        setTextQuery('');
    };

    const speak = (text: string) => {
        if (!window.speechSynthesis) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        utterance.pitch = 1.1; // Slightly higher pitch for a "fairy" feel
        utterance.volume = 1.0;

        window.speechSynthesis.speak(utterance);
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            setTranscript('');
            setResponse('');
            window.speechSynthesis.cancel();
            try {
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (e) {
                console.error("Error starting recognition", e);
            }
        }
    };

    const openAssistant = () => {
        setIsOpen(true);
        if (response === '') {
            const intro = "¡Hola mamá! Soy Luna, tu hada madrina. Estoy aquí para ayudarte con tu bebé en cualquier momento. ¿En qué puedo apoyarte hoy? ✨";
            setResponse(intro);
            if (!isMuted) speak(intro);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={openAssistant}
                className="floating-luna pulse-animation"
                style={{
                    position: 'fixed',
                    bottom: '90px',
                    right: '25px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                    border: 'none',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    cursor: 'pointer'
                }}
            >
                <Sparkles size={28} color="white" />
            </button>
        );
    }

    return (
        <div
            className="animate-fade-in"
            style={{
                position: 'fixed',
                bottom: '90px',
                right: '25px',
                width: '320px',
                maxHeight: '440px',
                background: 'var(--color-surface)',
                borderRadius: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                zIndex: 1001,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid var(--color-border)'
            }}
        >
            <div style={{
                padding: '15px 20px',
                background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-secondary-dark) 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={20} color="#FFE14C" />
                    <span style={{ fontWeight: 700 }}>Habla con Luna</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {transcript && (
                    <div style={{ alignSelf: 'flex-end', background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', padding: '10px 15px', borderRadius: '18px 18px 0 18px', fontSize: '0.9rem', maxWidth: '85%', fontWeight: 600 }}>
                        {transcript}
                    </div>
                )}

                {response && (
                    <div style={{ alignSelf: 'flex-start', background: 'var(--color-surface-variant)', color: 'var(--color-text)', padding: '12px 16px', borderRadius: '0 18px 18px 18px', fontSize: '0.95rem', lineHeight: 1.5, border: '1px solid var(--color-border)', maxWidth: '90%' }}>
                        {response}
                    </div>
                )}

                {isLoading && (
                    <div style={{ fontStyle: 'italic', color: 'var(--color-text-light)', fontSize: '0.8rem' }}>
                        Luna está pensando... ✨
                    </div>
                )}
            </div>

            <form onSubmit={handleTextSubmit} style={{ padding: '15px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--color-surface)' }}>
                <input
                    type="text"
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    placeholder="Escribe a Luna..."
                    className="luna-chat-input"
                    style={{
                        flex: 1,
                        background: 'var(--color-bg)',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: '12px',
                        padding: '10px 15px',
                        color: 'var(--color-text)',
                        fontSize: '0.9rem',
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    disabled={!textQuery.trim() || isLoading}
                    style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: (!textQuery.trim() || isLoading) ? 0.5 : 1,
                        cursor: (!textQuery.trim() || isLoading) ? 'not-allowed' : 'pointer'
                    }}
                >
                    <Sparkles size={18} />
                </button>
                <button
                    type="button"
                    onClick={toggleListening}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: isListening ? '#EF4444' : 'var(--color-bg)',
                        border: '1.5px solid var(--color-border)',
                        color: isListening ? 'white' : 'var(--color-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
            </form>
        </div>
    );
}
