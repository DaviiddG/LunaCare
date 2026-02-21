import { useState, useRef, useEffect } from 'react';
import { Send, Baby, Droplet, Moon, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/db';
import { chatWithLuna, type LunaContext } from '../lib/gemini';

interface Message {
    id: string;
    text: string;
    isLuna: boolean;
    timestamp: Date;
}

export function ChatPage() {
    const { user } = useAuth();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [babyId, setBabyId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            loadInitialData();
        }
    }, [user]);

    const loadInitialData = async () => {
        setIsLoading(true);
        // 1. Get Baby Profile
        const { data: baby } = await dbHelpers.getBabyProfile(user!.id);
        if (baby) {
            setBabyId(baby.id);
        }

        // 2. Load Chat History
        const { data: history } = await dbHelpers.getChatHistory(user!.id);
        if (history && history.length > 0) {
            const formattedHistory = history.map((msg: any) => ({
                id: msg.id,
                text: msg.content,
                isLuna: msg.role === 'assistant',
                timestamp: new Date(msg.created_at)
            }));
            setMessages(formattedHistory);
        } else {
            // Initial greeting if no history
            const introMsg = '¡Hola! Soy Luna 🌙, tu asistente personal. Estoy aquí para acompañarte, interpretar qué le pasa a tu bebé y darte tranquilidad. ¿Cómo ha estado tu día?';
            setMessages([{
                id: 'intro',
                text: introMsg,
                isLuna: true,
                timestamp: new Date()
            }]);

            // Simular guardado del saludo inicial para mantener concordancia
            if (baby) {
                await dbHelpers.insertChatMessage({
                    user_id: user!.id,
                    baby_id: baby.id,
                    role: 'assistant',
                    content: introMsg
                });
            }
        }
        setIsLoading(false);
    };

    const scrollToBottom = () => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (text: string = input, saveToDb: boolean = true) => {
        if (!text.trim() || !user) return;

        const tempId = Date.now().toString();
        const newMessage: Message = {
            id: tempId,
            text: text,
            isLuna: false,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setInput('');

        if (saveToDb && babyId) {
            await dbHelpers.insertChatMessage({
                user_id: user.id,
                baby_id: babyId,
                role: 'user',
                content: text
            });
        }

        setIsTyping(true);

        try {
            if (babyId) {
                // Fetch context
                const { data: recentFeeds } = await dbHelpers.getRecentFeedingLogs(babyId);
                const { data: recentSleeps } = await dbHelpers.getRecentSleepLogs(babyId);
                const { data: recentCries } = await dbHelpers.getRecentCryEvents(babyId);
                const { data: babyProfile } = await dbHelpers.getBabyProfile(user.id);

                const lunaContext: LunaContext = {
                    recentFeeds: recentFeeds || [],
                    recentSleeps: recentSleeps || [],
                    recentCries: recentCries || []
                };

                const historyContext = messages.map(m => ({
                    role: m.isLuna ? 'assistant' : 'user',
                    content: m.text
                }));

                const lunaResponse = await chatWithLuna(text, lunaContext, historyContext, babyProfile);

                await dbHelpers.insertChatMessage({
                    user_id: user.id,
                    baby_id: babyId,
                    role: 'assistant',
                    content: lunaResponse
                });

                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    text: lunaResponse,
                    isLuna: true,
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error("Error communicating with Luna:", error);
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickAction = async (actionText: string, eventType: 'cry' | 'food' | 'sleep') => {
        if (!user || !babyId) return;

        // 1. Send the visual message
        handleSend(actionText, false);

        // 2. Save specific event logic
        if (eventType === 'cry') {
            await dbHelpers.insertCryEvent({ user_id: user.id, baby_id: babyId, intensity: 'medium', description: 'Quick action tap' });
        } else if (eventType === 'food') {
            await dbHelpers.insertFeedingLog({ user_id: user.id, baby_id: babyId, food_type: 'quick_log' });
        } else if (eventType === 'sleep') {
            await dbHelpers.insertSleepLog({ user_id: user.id, baby_id: babyId, notes: 'Quick action tap' });
        }

        // 3. Save as chat message so AI remembers
        await dbHelpers.insertChatMessage({
            user_id: user.id,
            baby_id: babyId,
            role: 'user',
            content: `[Registro Rapido] ${actionText}`
        });
    };

    if (isLoading) {
        return <div className="flex-center" style={{ height: '100%', color: 'var(--color-primary)' }}><Loader2 className="animate-spin" size={32} /></div>;
    }

    return (
        <div className="animate-fade-in" style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 120px)', // adjust based on header
            position: 'relative',
        }}>
            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                paddingBottom: '120px',
            }} className="hide-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.isLuna ? 'flex-start' : 'flex-end',
                        width: '100%'
                    }}>
                        <div style={{
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: msg.isLuna ? '2px 20px 20px 20px' : '20px 2px 20px 20px',
                            background: msg.isLuna ? 'var(--color-surface)' : 'var(--color-primary)',
                            color: msg.isLuna ? 'var(--color-text)' : 'white',
                            boxShadow: 'var(--shadow-sm)',
                            fontSize: '0.95rem',
                            lineHeight: '1.4'
                        }}>
                            {msg.text}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginTop: '4px', padding: '0 4px' }}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}

                {isTyping && (
                    <div style={{ alignSelf: 'flex-start', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: '2px 20px 20px 20px' }}>
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>

            {/* Input Area (Fixed Bottom) */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                maxWidth: '480px',
                margin: '0 auto',
                padding: '15px',
                background: 'var(--color-bg)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 10
            }}>
                {/* Quick Actions (Pills) */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    paddingBottom: '5px'
                }}
                    className="hide-scrollbar">
                    <button
                        onClick={() => handleQuickAction("😭 Mi bebé llora sin parar", "cry")}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            whiteSpace: 'nowrap',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}
                    >
                        <Baby size={16} /> Llora
                    </button>
                    <button
                        onClick={() => handleQuickAction("🍼 Acaba de comer", "food")}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            whiteSpace: 'nowrap',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}
                    >
                        <Droplet size={16} /> Comió
                    </button>
                    <button
                        onClick={() => handleQuickAction("💤 Se acaba de dormir", "sleep")}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            color: '#a78bfa',
                            border: '1px solid rgba(167, 139, 250, 0.2)',
                            whiteSpace: 'nowrap',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}
                    >
                        <Moon size={16} /> Se durmió
                    </button>
                </div>

                {/* Text Input */}
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe a Luna..."
                        style={{
                            width: '100%',
                            padding: '16px 50px 16px 20px',
                            borderRadius: '25px',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            fontSize: '1rem',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        style={{
                            position: 'absolute',
                            right: '6px',
                            width: '40px',
                            height: '40px',
                            borderRadius: '20px',
                            background: input.trim() && !isTyping ? 'var(--color-primary)' : 'var(--color-surface)',
                            color: input.trim() && !isTyping ? 'white' : 'var(--color-text-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed'
                        }}
                    >
                        <Send size={18} style={{ marginLeft: '2px' }} />
                    </button>
                </form>
            </div>
        </div>
    );
}

