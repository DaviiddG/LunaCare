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
    const { selectedBaby, babies, fetchBabies } = useBabies();

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
        if (!user || !babies || babies.length === 0) return "";
        try {
            let contextText = "==== INFORMACIÓN DE LOS BEBÉS DEL USUARIO ====\n";
            contextText += "Si te piden registrar algo sin especificar nombre, PREGUNTA A CUÁL BEBÉ SE REFIEREN basándote en esta lista:\n\n";

            for (const b of babies) {
                // Fetch recent logs to provide better context per baby
                const [dietRes, diaperRes, sleepRes] = await Promise.all([
                    dbHelpers.getDiets(b.id).then(res => res.data?.slice(0, 1) || []),
                    dbHelpers.getDiapers(b.id).then(res => res.data?.slice(0, 1) || []),
                    dbHelpers.getSleepLogs(b.id).then(res => res.data?.slice(0, 1) || [])
                ]);

                contextText += `- BEBÉ: ${b.name} (ID: ${b.id})\n`;
                contextText += `  Género: ${b.gender || 'No especificado'}, Nacimiento: ${b.birth_date || 'No especificada'}\n`;

                if (dietRes.length > 0) {
                    contextText += `  Última comida: ${dietRes[0].amount}${dietRes[0].type === 'pecho' ? 'min' : 'ml'} de ${dietRes[0].type}\n`;
                }
                if (diaperRes.length > 0) {
                    contextText += `  Último pañal: ${diaperRes[0].status}\n`;
                }
                if (sleepRes.length > 0) {
                    contextText += `  Último sueño: ${sleepRes[0].duration}\n`;
                }
                contextText += "\n";
            }

            contextText += `==== BEBÉ ACTUALMENTE SELECCIONADO EN LA INTERFAZ: ${selectedBaby?.name} ====\n`;
            contextText += `NOTA: Si el usuario dice "él", "ella", o no especifica, PUEDES asumir que es ${selectedBaby?.name} (ID: ${selectedBaby?.id}), pero si es una acción destructiva o de registro y tienes dudas, pregunta.\n`;

            return contextText;
        } catch (error) {
            return `Usuario tiene ${babies.length} bebés registrados.`;
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
            const { text, actions, error } = await geminiHelpers.sendMessageWithContext(userText, chatHistory, babyContext);

            if (actions && actions.length > 0 && !error) {
                let combinedActionText = "";

                for (const action of actions) {
                    const call = action.args as any;
                    let actionText = "He registrado la acción solicitada.";

                    try {
                        const targetBabyId = call.babyId || selectedBaby.id;
                        const targetBaby = babies.find(b => b.id === targetBabyId) || selectedBaby;

                        if (action.name === 'logBabyDiet') {
                            await dbHelpers.insertDiet({
                                user_id: user.id,
                                baby_id: targetBabyId,
                                type: call.type,
                                amount: call.amount,
                                observations: call.observations || "Registrado por Luna"
                            });
                            actionText = `🍼 Listo, he anotado la toma de ${call.type} (${call.amount}${call.type === 'pecho' ? ' min' : ' ml'}) para ${targetBaby.name}.`;
                        } else if (action.name === 'logBabyDiaper') {
                            await dbHelpers.insertDiaper({
                                user_id: user.id,
                                baby_id: targetBabyId,
                                status: call.status,
                                observations: call.observations || "Registrado por Luna"
                            });
                            actionText = `✨ Listo, he anotado el cambio de pañal (${call.status}) de ${targetBaby.name}.`;
                        } else if (action.name === 'logBabySleep') {
                            const end = new Date();
                            const start = new Date(end.getTime() - ((call.durationMinutes || 0) * 60 * 1000));
                            await dbHelpers.insertSleepLog({
                                user_id: user.id,
                                baby_id: targetBabyId,
                                start_time: start.toISOString(),
                                end_time: end.toISOString(),
                                duration: `${call.durationMinutes} minutos`
                            });
                            actionText = `😴 Listo, he anotado que ${targetBaby.name} durmió por ${call.durationMinutes} minutos.`;
                        } else if (action.name === 'logAddBaby') {
                            await dbHelpers.upsertBabyProfile({
                                user_id: user.id,
                                name: call.name,
                                gender: call.gender || null,
                                birth_date: call.birthDate || new Date().toISOString().split('T')[0],
                                weight: call.weight || 0,
                                height: call.height || 0
                            });
                            await fetchBabies();
                            actionText = `👶 ¡Listo! He agregado el perfil de ${call.name} a tu familia.`;
                        } else if (action.name === 'logDeleteBaby') {
                            if (targetBabyId) {
                                await dbHelpers.deleteBabyProfile(targetBabyId, user.id);
                                await fetchBabies();
                                const deletedName = babies.find(b => b.id === targetBabyId)?.name || 'el bebé';
                                actionText = `🗑️ He borrado de manera permanente el perfil y todos los historiales de ${deletedName}.`;
                            } else {
                                actionText = `No pude encontrar al bebé para borrar.`;
                            }
                        } else if (action.name === 'logUpdateBaby') {
                            const newWeight = call.weight !== undefined ? call.weight : targetBaby.weight;
                            const newHeight = call.height !== undefined ? call.height : targetBaby.height;

                            await dbHelpers.upsertBabyProfile({
                                id: targetBabyId,
                                user_id: user.id,
                                name: targetBaby.name,
                                gender: targetBaby.gender,
                                birth_date: targetBaby.birth_date,
                                weight: newWeight,
                                height: newHeight
                            });

                            await fetchBabies();
                            actionText = `📈 ¡Actualizado! He registrado las nuevas medidas para ${targetBaby.name}.`;
                        }
                    } catch (dbErr) {
                        console.error("DB Error processing action:", dbErr);
                        actionText = "Lo siento, intenté registrarlo pero hubo un problema al guardarlo en tu historial.";
                    }

                    combinedActionText += actionText + "\n";
                }

                const finalText = text ? `${text}\n\n${combinedActionText.trim()}` : combinedActionText.trim();

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
                    bottom: '90px',
                    right: '20px',
                    width: '380px',
                    maxWidth: 'calc(100vw - 40px)',
                    height: '600px',
                    maxHeight: 'calc(100vh - 120px)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--color-surface, #ffffff)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px var(--color-border)',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <style>
                        {`
                          @keyframes slideUp {
                            from { opacity: 0; transform: translateY(20px) scale(0.95); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                          }
                          .chat-scroll::-webkit-scrollbar { width: 6px; }
                          .chat-scroll::-webkit-scrollbar-track { background: transparent; }
                          .chat-scroll::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 10px; }
                        `}
                    </style>
                    {/* Header */}
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        color: 'white'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '18px',
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Luna</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>
                                    Asesora de {selectedBaby.name}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{
                            background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                            transition: 'background 0.2s'
                        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--color-bg)' }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--color-text-light)', marginTop: '20px', fontSize: '0.9rem' }}>
                                <Sparkles size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                <p style={{ margin: 0 }}>¡Hola! Soy Luna.<br />¿En qué te puedo ayudar hoy con {selectedBaby.name}?</p>
                            </div>
                        )}

                        {messages.map((msg) => {
                            const isUser = msg.role === 'user';
                            return (
                                <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                                    <div style={{
                                        maxWidth: '85%',
                                        padding: '10px 14px',
                                        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        background: isUser ? 'var(--color-primary)' : 'var(--color-surface)',
                                        color: isUser ? 'white' : 'var(--color-text)',
                                        border: isUser ? 'none' : '1px solid var(--color-border)',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.4,
                                        boxShadow: isUser ? '0 2px 8px color-mix(in srgb, var(--color-primary) 30%, transparent)' : '0 2px 5px rgba(0,0,0,0.02)'
                                    }}>
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
                                    background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)'
                                }}>
                                    <Loader2 size={16} className="animate-spin" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{ background: 'var(--color-surface)' }}>
                        <form onSubmit={handleSend} style={{
                            padding: '12px',
                            borderTop: '1px solid var(--color-border)',
                            display: 'flex',
                            gap: '8px',
                            background: 'var(--color-surface)'
                        }}>
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={`Mensaje a Luna...`}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    borderRadius: '20px',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg)',
                                    color: 'var(--color-text)',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                style={{
                                    width: '40px', height: '40px', borderRadius: '20px', flexShrink: 0,
                                    background: input.trim() ? 'var(--color-primary)' : 'var(--color-surface-variant)',
                                    color: input.trim() ? 'white' : 'var(--color-text-light)',
                                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Send size={18} style={{ marginLeft: '2px' }} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
