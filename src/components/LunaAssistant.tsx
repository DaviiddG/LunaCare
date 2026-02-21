import { useState, useEffect, useRef } from 'react';
import { chatWithLuna } from '../lib/gemini';
import { supabase } from '../lib/supabase';
import { Sparkles, X } from 'lucide-react';

export function LunaAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [appContext, setAppContext] = useState('');
    const [textQuery, setTextQuery] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'luna', content: string }[]>([]);
    const [babyProfile, setBabyProfile] = useState<any>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, response, isLoading]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchInitialData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Fetch profile and history in parallel
        const [profile, history] = await Promise.all([
            supabase.from('baby_profiles').select('*').eq('user_id', session.user.id).single(),
            supabase.from('chat_history').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(10)
        ]);

        if (profile.data) setBabyProfile(profile.data);
        if (history.data) setChatHistory(history.data.reverse());

        await fetchAppContext();

        if (history.data?.length === 0 && response === '') {
            const intro = "¡Hola mamá! Soy Luna, tu hada madrina. Estoy aquí para ayudarte con tu bebé en cualquier momento. ¿En qué puedo apoyarte hoy? ✨";
            setResponse(intro);
        }
    };

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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        setIsLoading(true);

        // Add user query to local history immediately
        const userMsg = { role: 'user' as const, content: query };
        setChatHistory(prev => [...prev, userMsg]);

        // Save user message to Supabase
        await supabase.from('chat_history').insert([{
            user_id: session.user.id,
            role: 'user',
            content: query
        }]);

        // Refresh context
        await fetchAppContext();

        // Get AI response
        const aiResult = await chatWithLuna(query, appContext, chatHistory, babyProfile);

        const lunaMsg = { role: 'luna' as const, content: aiResult };
        setChatHistory(prev => [...prev, lunaMsg]);
        setResponse(aiResult);

        // Save Luna response to Supabase
        await supabase.from('chat_history').insert([{
            user_id: session.user.id,
            role: 'luna',
            content: aiResult
        }]);

        setIsLoading(false);
    };

    const handleTextSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!textQuery.trim() || isLoading) return;
        handleLunaQuery(textQuery);
        setTextQuery('');
    };

    const openAssistant = () => {
        setIsOpen(true);
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
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <X size={18} />
                </button>
            </div>

            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {chatHistory.length === 0 && !response && (
                    <div style={{ color: 'var(--color-text-light)', textAlign: 'center', fontSize: '0.85rem', marginTop: '20px' }}>
                        ¡Empieza a hablar con Luna! ✨
                    </div>
                )}

                {chatHistory.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            background: msg.role === 'user' ? 'var(--color-primary-light)' : 'var(--color-surface-variant)',
                            color: msg.role === 'user' ? 'var(--color-primary-dark)' : 'var(--color-text)',
                            padding: '10px 15px',
                            borderRadius: msg.role === 'user' ? '18px 18px 0 18px' : '0 18px 18px 18px',
                            fontSize: '0.9rem',
                            maxWidth: '85%',
                            fontWeight: msg.role === 'user' ? 600 : 400,
                            border: msg.role === 'luna' ? '1px solid var(--color-border)' : 'none',
                            lineHeight: 1.4
                        }}
                    >
                        {msg.content}
                    </div>
                ))}

                {isLoading && (
                    <div style={{ fontStyle: 'italic', color: 'var(--color-text-light)', fontSize: '0.8rem' }}>
                        Luna está pensando... ✨
                    </div>
                )}
                <div ref={chatEndRef} />
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
                        cursor: (!textQuery.trim() || isLoading) ? 'not-allowed' : 'pointer',
                        border: 'none'
                    }}
                >
                    <Sparkles size={18} />
                </button>
            </form>
        </div>
    );
}
