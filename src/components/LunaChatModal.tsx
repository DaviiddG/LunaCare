import { useEffect, useState, useRef } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useBabies } from '../hooks/useBabies';
import { LunaSettingsModal } from './LunaSettingsModal';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
    type?: 'text' | 'tip';
}

interface LunaChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LunaChatModal({ isOpen, onClose }: LunaChatModalProps) {
    const { user } = useAuth();
    const { selectedBaby } = useBabies();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [lunaIconUrl, setLunaIconUrl] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');
    const [lunaProfile, setLunaProfile] = useState(localStorage.getItem('luna_profile') || 'serena');
    const [selectedImage, setSelectedImage] = useState<{ file: File, base64: string, preview: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    // Fetch conversation when modal opens or baby changes
    useEffect(() => {
        if (isOpen && selectedBaby) {
            fetchConversation();
        }
    }, [isOpen, selectedBaby]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const fetchConversation = async () => {
        if (!selectedBaby) return;
        const { data } = await dbHelpers.getAiConversations(selectedBaby.id, 50);
        if (data) {
            setMessages(data as Message[]);
        }
    };

    useEffect(() => {
        const handleSettingsUpdate = () => {
            setLunaIconUrl(localStorage.getItem('luna_icon') || '/luna-avatar.png');
            setLunaProfile(localStorage.getItem('luna_profile') || 'serena');
        };
        window.addEventListener('luna-settings-updated', handleSettingsUpdate);
        return () => window.removeEventListener('luna-settings-updated', handleSettingsUpdate);
    }, []);

    const toggleListen = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('El reconocimiento de voz no está soportado en este navegador.');
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.lang = 'es-ES';
        recognition.interimResults = true;

        // Save current input to append to it
        const currentInput = input;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            setInput(currentInput + (currentInput ? ' ' : '') + finalTranscript + interimTranscript);
        };
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Extract just the base64 part, removing the data URL prefix
            const base64Data = base64String.split(',')[1];
            setSelectedImage({
                file,
                base64: base64Data,
                preview: base64String
            });
        };
        reader.readAsDataURL(file);
    };

    const SUGGESTIONS_POOL = [
        'Dime algo relajante', 'Resumen del día', '¿Cómo manejar berrinches?',
        '¿Por qué llora?', 'Horario de siesta', 'Recetas de sólidos', 'Hitos del mes',
        'Tips de baño', 'Juegos sugeridos', 'Mi bebé no duerme'
    ];
    const getRandomSuggestions = () => [...SUGGESTIONS_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
    const [suggestions, setSuggestions] = useState(getRandomSuggestions());

    const handleQuickAction = (text: string) => {
        const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
        handleSend(fakeEvent, text);
    };

    const handleSend = async (e: React.FormEvent, manualText?: string) => {
        e.preventDefault();
        const userText = manualText || input.trim();
        const currentImage = selectedImage; // Store current image reference

        if (!userText && !currentImage) return; // Allow sending if image but no text
        if (!user || !selectedBaby || isLoading) return;

        if (!manualText) setInput('');
        setSelectedImage(null); // Clear early for better UX

        const tempId = Date.now().toString();
        const newMessage: Message = {
            id: tempId,
            role: 'user',
            content: userText,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMessage]);
        setIsLoading(true);
        setSuggestions(getRandomSuggestions());

        const contentToStore = userText || "Envió una imagen.";

        try {
            await dbHelpers.insertAiMessage({
                user_id: user.id,
                baby_id: selectedBaby.id,
                role: 'user',
                content: contentToStore
            });

            const chatHistory = messages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user' as 'model' | 'user',
                parts: [{ text: msg.content }]
            }));

            const profile = localStorage.getItem('luna_profile') || 'serena';
            const frequency = localStorage.getItem('luna_frequency') || 'balanced';

            let context = `Eres Luna, una asistente de LunaCare.
Responde de forma muy natural, empática y conversacional en ESPAÑOL, como si fueras una pediatra o una amiga con experiencia.
Bebé actual (en contexto del chat): ${selectedBaby.name}.
PERSONALIDAD ACTUAL: ${profile === 'serena' ? 'Eres Luna Noche Serena. Tu tono es extremadamente dulce, calmado y empático. Buscas transmitir tranquilidad.' : 'Eres Luna Día Activo. Tu tono es energético, directo y motivador. Buscas ser eficiente y clara.'}
FRECUENCIA DE CONSEJOS: ${frequency === 'frequent' ? 'Aprovecha cada oportunidad para dar consejos útiles.' : frequency === 'occasional' ? 'Solo da consejos si el usuario los pide explícitamente.' : 'Da consejos de forma equilibrada cuando sea realmente relevante.'}
INSTRUCCIÓN CRÍTICA: Tienes funciones disponibles. Si el usuario te pide explícitamente agregar o registrar a un hijo nuevo, LLAMA A LA FUNCIÓN logAddBaby pasando todos los datos (nombre, fecha de nacimiento o calcularla según lo que te digan p.ej 'nació antier', peso en kg, altura en cm). ¡No le digas al usuario que no puedes hacerlo, USA LA FUNCIÓN! Si te piden agregar un bebé nuevo pero no te dicen nombre, peso o altura, pregúntales amablemente esos datos primero.
OTRA INSTRUCCIÓN CRÍTICA: NUNCA uses sintaxis de markdown para formatear tu texto (no uses asteriscos ** para negritas ni itálicas). Habla en párrafos normales, claros y fluidos. No parezcas un bot, sé muy humana.
CONSEJOS DINÁMICOS: Si decides dar un consejo relevante o tip, hazlo SIEMPRE al final de tu respuesta usando EXACTAMENTE la siguiente estructura (en líneas separadas y sin asteriscos ni markdown extra):
TIP_TITLE: [Escribe aquí el título del tip]
TIP_CONTENT: [Escribe aquí el contenido del tip]
`;

            let imageParts: any[] = [];
            if (currentImage) {
                imageParts.push({
                    inlineData: {
                        data: currentImage.base64,
                        mimeType: currentImage.file.type
                    }
                });
            }

            const { geminiHelpers } = await import('../lib/gemini');
            const result = await geminiHelpers.sendMessageWithContext(userText || "Analiza esta imagen.", chatHistory, context, imageParts.length > 0 ? imageParts : undefined);

            let didAction = false;
            if (result.actions && result.actions.length > 0) {
                for (const action of result.actions) {
                    try {
                        const args = action.args as any;
                        if (action.name === 'logAddBaby') {
                            await dbHelpers.upsertBabyProfile({
                                user_id: user.id,
                                name: args.name,
                                gender: args.gender || 'Bebé',
                                birth_date: args.birthDate || new Date().toISOString().split('T')[0],
                                weight: args.weight || 0,
                                height: args.height || 0
                            });
                            didAction = true;
                        } else if (action.name === 'logBabySleep') {
                            await dbHelpers.insertSleepLog({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                start_time: new Date(Date.now() - (args.durationMinutes * 60000)).toISOString(),
                                end_time: new Date().toISOString(),
                                duration: args.durationMinutes.toString()
                            });
                            didAction = true;
                        } else if (action.name === 'logBabyDiaper') {
                            await dbHelpers.insertDiaper({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                status: args.status,
                                observations: args.observations || ''
                            });
                            didAction = true;
                        } else if (action.name === 'logBabyDiet') {
                            await dbHelpers.insertDiet({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                type: args.type,
                                amount: args.amount,
                                observations: args.observations || ''
                            });
                            didAction = true;
                        }
                    } catch (err) {
                        console.error("Error ejecutando acción de Luna:", err);
                    }
                }
            }

            let responseText = result.text;
            if (!responseText && didAction) {
                responseText = "¡Listo! Ya he guardado la información que me pediste.";
            }

            if (responseText) {
                const assistantMsgId = (Date.now() + 1).toString();
                const assistantMessage: Message = {
                    id: assistantMsgId,
                    role: 'assistant',
                    content: responseText,
                    created_at: new Date().toISOString()
                };

                setMessages(prev => [...prev, assistantMessage]);
                await dbHelpers.insertAiMessage({
                    user_id: user.id,
                    baby_id: selectedBaby.id,
                    role: 'assistant',
                    content: responseText
                });

                if (didAction) {
                    window.dispatchEvent(new CustomEvent('luna-action-completed'));
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    // Icono base de Luna (personalizable desde la configuración)
    // const lunaIconUrl = localStorage.getItem('luna_icon') || '/luna-avatar.png'; // Moved to state

    return (
        <div className="fixed inset-0 z-[100] bg-background-light dark:bg-[#0a110c] text-slate-900 dark:text-slate-100 flex flex-col animate-fade-in font-chat">
            {/* Header Redesign */}
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-[#0a110c]/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-[#8c2bee]/10 mt-8">
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-primary">arrow_back_ios_new</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">auto_awesome</span>
                    <h1 className="text-lg font-bold tracking-tight">
                        Luna {lunaProfile === 'serena' ? 'Noche Serena' : 'Día Activo'}
                    </h1>
                </div>
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-primary">more_vert</span>
                </button>
            </header>

            {/* Settings Modal */}
            <LunaSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={() => {
                    setIsSettingsOpen(false);
                    // Force refresh icon if it changed
                    window.dispatchEvent(new CustomEvent('luna-settings-updated'));
                }}
            />

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6 hide-scrollbar">
                {messages.length === 0 && (
                    <div className="flex items-start gap-3 max-w-[85%]">
                        <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 mt-1 overflow-hidden">
                            <img className="w-full h-full object-cover" src={lunaIconUrl} alt="Luna" />
                        </div>
                        <div className="space-y-1">
                            <div className="bg-white dark:bg-[#1a251b] text-slate-900 dark:text-slate-100 p-4 rounded-xl rounded-tl-none message-shadow text-sm leading-relaxed border border-[#8c2bee]/10">
                                ¡Hola! Soy Luna, tu asistente personal. ¿En qué puedo ayudarte con {selectedBaby?.name || 'tu bebé'} hoy?
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((msg) => {
                    const isLuna = msg.role === 'assistant';

                    let displayText = msg.content;
                    let tipTitle = null;
                    let tipContent = null;

                    if (isLuna && displayText.includes('TIP_TITLE:') && displayText.includes('TIP_CONTENT:')) {
                        const titleMatch = displayText.match(/TIP_TITLE:\s*(.+)/);
                        const contentMatch = displayText.match(/TIP_CONTENT:\s*([\s\S]+)/);

                        if (titleMatch && contentMatch) {
                            tipTitle = titleMatch[1].trim();
                            tipContent = contentMatch[1].trim();

                            // Remove tip block from display text
                            displayText = displayText.replace(/TIP_TITLE:[\s\S]*/, '').trim();
                        }
                    }

                    return (
                        <div key={msg.id} className={`flex items-start gap-3 ${isLuna ? 'max-w-[85%]' : 'justify-end ml-auto max-w-[85%]'}`}>
                            {isLuna && (
                                <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 mt-1 overflow-hidden">
                                    <img className="w-full h-full object-cover" src={lunaIconUrl} alt="Luna" />
                                </div>
                            )}
                            <div className={`space-y-1 ${isLuna ? '' : 'flex flex-col items-end'}`}>
                                <div className={`p-4 rounded-xl message-shadow text-sm leading-relaxed ${isLuna
                                    ? 'bg-white dark:bg-[#1a251b] text-slate-800 dark:text-slate-100 rounded-tl-none border border-[#8c2bee]/10'
                                    : 'bg-[#8c2bee]/20 dark:bg-primary/20 text-slate-900 dark:text-slate-100 rounded-tr-none'
                                    }`}>
                                    {displayText}
                                    {tipTitle && tipContent && (
                                        <RichTipCard title={tipTitle} content={tipContent} />
                                    )}
                                </div>
                                <span className={`text-[10px] text-slate-500 ${isLuna ? 'ml-1' : 'mr-1'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex items-start gap-3 max-w-[85%] animate-pulse">
                        <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 mt-1 overflow-hidden" />
                        <div className="bg-white dark:bg-[#1a251b] p-4 rounded-xl rounded-tl-none message-shadow text-sm text-slate-400">Luna está escribiendo...</div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* Bottom Actions & Input */}
            <footer className="p-4 pb-8 space-y-4 bg-background-light dark:bg-[#0a110c] border-t border-[#8c2bee]/10 relative">

                {/* Image Preview */}
                {selectedImage && (
                    <div className="absolute bottom-[100%] left-4 mb-2 bg-white dark:bg-[#16251b] p-2 rounded-xl border border-primary/20 shadow-lg animate-fade-in z-10 flex flex-col gap-2">
                        <div className="relative">
                            <img src={selectedImage.preview} alt="Upload preview" className="h-24 w-24 object-cover rounded-lg" />
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute -top-2 -right-2 size-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md transition-colors"
                            >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Chips */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                    {suggestions.map(chip => (
                        <button
                            key={chip}
                            onClick={() => handleQuickAction(chip)}
                            className="whitespace-nowrap px-4 py-2 bg-slate-200/50 dark:bg-[#16251b] text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-full border border-slate-300/50 dark:border-primary/20 hover:bg-[#8c2bee]/10 hover:border-[#8c2bee] transition-colors"
                        >
                            {chip}
                        </button>
                    ))}
                </div>

                {/* Input Bar */}
                <form onSubmit={(e) => handleSend(e)} className="flex items-center gap-2 bg-white dark:bg-[#16251b] border-2 border-[#8c2bee]/20 dark:border-[#8c2bee]/30 rounded-full px-2 py-2 shadow-sm focus-within:border-[#8c2bee] transition-all">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2 transition-colors ${selectedImage ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
                    >
                        <span className="material-symbols-outlined">photo_camera</span>
                    </button>
                    <input
                        className="flex-1 bg-transparent border-transparent outline-none focus:outline-none focus:ring-0 focus:border-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 w-full"
                        style={{ boxShadow: 'none', outline: 'none', border: 'none' }}
                        placeholder="Pregúntale algo..."
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={toggleListen}
                        className={`p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-500 hover:text-primary'}`}
                    >
                        <span className="material-symbols-outlined">{isListening ? 'graphic_eq' : 'mic'}</span>
                    </button>
                    <button
                        type="submit"
                        disabled={(!input.trim() && !selectedImage) || isLoading}
                        className="size-10 bg-[#8c2bee] text-white rounded-full flex items-center justify-center hover:bg-[#7b24d6] active:scale-95 transition-all disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined font-bold">send</span>
                    </button>
                </form>
            </footer>
        </div>
    );
}

function RichTipCard({ title, content }: { title: string, content: string }) {
    return (
        <div className="bg-[#16251b] border border-primary/20 rounded-2xl overflow-hidden shadow-xl max-w-sm mt-4 animate-fade-in">
            <div className="h-32 w-full bg-cover bg-center relative" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAKp0d8jBm26y7VELDtHoftH0B9n86hcRA273hdl1oijF0cv--z2Ty_ijmCzjMj8GsMNS2XQxbVH7-KIV0W9xu7klpHuXcgSiAwI2faQsD8MuDgA1Ix7X6c19MpMAv2OZp8GmQ_cGDMdXZMey-jwLoBxJt4pyhmpr1kbDx0iEgSxj3rgz9E0AVXWmEzlJBHvtgP_DRgqRXnOqoGmiynGOcLj7cegBMYboWjc9yLsnfjcXCYW5pyxcQHKSnHpjTMyEDjyAXyp3GwW_w')" }}>
                <div className="w-full h-full bg-gradient-to-t from-[#16251b] to-transparent"></div>
            </div>
            <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-lg">lightbulb</span>
                    <h3 className="text-white font-bold text-base">{title}</h3>
                </div>
                <p className="text-slate-300 text-sm mb-2">
                    {content}
                </p>
            </div>
        </div>
    );
}
