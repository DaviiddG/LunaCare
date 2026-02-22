import { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/db';
import { geminiHelpers } from '../lib/gemini';
import { useBabies } from '../hooks/useBabies';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export function LunaChatModal() {
    const { user } = useAuth();
    const { selectedBaby } = useBabies();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch conversation when modal opens or baby changes
    useEffect(() => {
        if (isOpen && selectedBaby) {
            fetchConversation();
        }
    }, [isOpen, selectedBaby]);

    useEffect(() => {
        // Auto scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const fetchConversation = async () => {
        if (!selectedBaby) return;
        const { data } = await dbHelpers.getAiConversations(selectedBaby.id, 50);
        if (data) {
            setMessages(data as Message[]);
        }
    };

    const buildBabyContext = async () => {
        if (!user || !selectedBaby) return "";
        try {
            // Fetch today's records for context
            await Promise.all([
                dbHelpers.getDiets(selectedBaby.id),
                dbHelpers.getDiapers(selectedBaby.id),
                dbHelpers.getSleepLogs(selectedBaby.id)
            ]);

            // Filter for the selected baby (currently diets/diapers/sleep might not have baby_id yet, but assuming they are general for now, or we just format what we have)
            // Wait, we haven't added baby_id to diets, diapers, sleep_logs yet.
            // For now, we will just say:
            const contextText = `
Bebé actual: ${selectedBaby.name}, Género: ${selectedBaby.gender}, Nacimiento: ${selectedBaby.birth_date}.
            `;
            return contextText;
        } catch (error) {
            return `Bebé actual: ${selectedBaby?.name}`;
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user || !selectedBaby || isLoading) return;

        const userText = input.trim();
        setInput('');

        // Optimistic UI updates
        const tempId = Date.now().toString();
        const newMessage: Message = {
            id: tempId,
            role: 'user',
            content: userText,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMessage]);
        setIsLoading(true);

        try {
            // 1. Save user message to DB
            await dbHelpers.insertAiMessage({
                user_id: user.id,
                baby_id: selectedBaby.id,
                role: 'user',
                content: userText
            });

            // 2. Prepare chat history for Gemini format
            const chatHistory = messages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user' as 'model' | 'user',
                parts: [{ text: msg.content }]
            }));

            // 3. Get context
            const babyContext = await buildBabyContext();

            // 4. Send to Gemini
            const { text, action, error } = await geminiHelpers.sendMessageWithContext(userText, chatHistory, babyContext);

            if (action && !error) {
                const call = action.args as any;
                let actionText = "He registrado la acción solicitada.";

                try {
                    if (action.name === 'logBabyDiet') {
                        await dbHelpers.insertDiet({
                            user_id: user.id,
                            baby_id: selectedBaby.id,
                            type: call.type,
                            amount: call.amount,
                            observations: call.observations || "Registrado por Luna"
                        });
                        actionText = `🍼 Listo, he anotado la toma de ${call.type} (${call.amount}${call.type === 'pecho' ? ' min' : ' ml'}).`;
                    } else if (action.name === 'logBabyDiaper') {
                        await dbHelpers.insertDiaper({
                            user_id: user.id,
                            baby_id: selectedBaby.id,
                            status: call.status,
                            observations: call.observations || "Registrado por Luna"
                        });
                        actionText = `✨ Listo, he anotado el cambio de pañal (${call.status}).`;
                    } else if (action.name === 'logBabySleep') {
                        const end = new Date();
                        const start = new Date(end.getTime() - ((call.durationMinutes || 0) * 60 * 1000));
                        await dbHelpers.insertSleepLog({
                            user_id: user.id,
                            baby_id: selectedBaby.id,
                            start_time: start.toISOString(),
                            end_time: end.toISOString(),
                            duration: `${call.durationMinutes} minutos`
                        });
                        actionText = `😴 Listo, he anotado que durmió por ${call.durationMinutes} minutos.`;
                    }
                } catch (dbErr) {
                    console.error("DB Error processing action:", dbErr);
                    actionText = "Lo siento, intenté registrarlo pero hubo un problema al guardarlo en tu historial.";
                }

                const finalText = text ? `${text}\n\n${actionText}` : actionText;

                const { data: savedMsg } = await dbHelpers.insertAiMessage({
                    user_id: user.id,
                    baby_id: selectedBaby.id,
                    role: 'assistant',
                    content: finalText
                });

                if (savedMsg) {
                    setMessages(prev => [...prev, savedMsg as Message]);
                } else {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: finalText,
                        created_at: new Date().toISOString()
                    }]);
                }
            } else if (text && !error) {
                // 5. Save assistant message to DB
                const { data: savedMsg } = await dbHelpers.insertAiMessage({
                    user_id: user.id,
                    baby_id: selectedBaby.id,
                    role: 'assistant',
                    content: text
                });

                if (savedMsg) {
                    setMessages(prev => [...prev, savedMsg as Message]);
                } else {
                    // Fallback if db save fails
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: text,
                        created_at: new Date().toISOString()
                    }]);
                }
            } else {
                console.error("Gemini Error:", error);
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: "Lo siento, tuve un problema al conectarme con mis servidores. ¿Puedes intentar de nuevo?",
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Only render FAB if we have a selected baby
    if (!selectedBaby) return null;

    return (
        <>
            {/* Floating Action Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="animate-float"
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        width: '60px',
                        height: '60px',
                        borderRadius: '30px',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        color: 'white',
                        border: 'none',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 900
                    }}
                >
                    <Sparkles size={28} />
                </button>
            )}

            {/* Chat Modal */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--video-overlay, rgba(0,0,0,0.6))',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        flex: 1,
                        margin: '20px',
                        marginTop: '40px',
                        background: 'var(--card-glass, rgba(255,255,255,0.9))',
                        borderRadius: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '20px',
                                    background: 'var(--color-primary)', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Luna</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                                        Asistente de {selectedBaby.name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} style={{
                                background: 'transparent', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer', padding: '8px'
                            }}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {messages.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--color-text-light)', marginTop: '40px' }}>
                                    <Sparkles size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                                    <p>¡Hola! Soy Luna.<br />¿En qué te puedo ayudar hoy con {selectedBaby.name}?</p>
                                </div>
                            )}

                            {messages.map((msg) => {
                                const isUser = msg.role === 'user';
                                return (
                                    <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                                        <div style={{
                                            maxWidth: '80%',
                                            padding: '12px 16px',
                                            borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                            background: isUser ? 'var(--color-primary)' : 'var(--color-surface-variant)',
                                            color: isUser ? 'white' : 'var(--color-text)',
                                            fontSize: '0.95rem',
                                            lineHeight: 1.4,
                                            boxShadow: 'var(--shadow-sm)'
                                        }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            })}

                            {isLoading && (
                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                    <div style={{
                                        padding: '12px 16px', borderRadius: '20px 20px 20px 4px',
                                        background: 'var(--color-surface-variant)', color: 'var(--color-text)'
                                    }}>
                                        <Loader2 size={18} className="animate-spin" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} style={{
                            padding: '16px',
                            borderTop: '1px solid var(--color-border)',
                            display: 'flex',
                            gap: '10px',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={`Pregúntale a Luna sobre ${selectedBaby.name}...`}
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    borderRadius: '24px',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg)',
                                    color: 'var(--color-text)',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                style={{
                                    width: '44px', height: '44px', borderRadius: '22px',
                                    background: input.trim() ? 'var(--color-primary)' : 'var(--color-surface-variant)',
                                    color: input.trim() ? 'white' : 'var(--color-text-light)',
                                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Send size={20} style={{ marginLeft: '2px' }} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
