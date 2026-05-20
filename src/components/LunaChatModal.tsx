import { useEffect, useState, useRef, useCallback } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { useBabies } from '../hooks/useBabies';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { LunaSettingsModal } from './LunaSettingsModal';

// Speech Recognition Types
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: {
        length: number;
        [key: number]: {
            isFinal: boolean;
            [key: number]: {
                transcript: string;
            };
        };
    };
}

interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    onstart: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
}

interface WindowWithSpeech extends Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
}

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
    const { selectedBaby, fetchBabies } = useBabies();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [lunaIconUrl, setLunaIconUrl] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');
    const [lunaProfile, setLunaProfile] = useState(localStorage.getItem('luna_profile') || 'serena');
    const [lunaFrequency, setLunaFrequency] = useState(localStorage.getItem('luna_frequency') || 'balanced');
    const [lunaVoice, setLunaVoice] = useState(localStorage.getItem('luna_voice') || 'soprano');
    const [selectedImage, setSelectedImage] = useState<{ file: File, base64: string, preview: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    const getBabyAgeInMonths = (birthDateStr: string) => {
        if (!birthDateStr) return 0;
        const birth = new Date(birthDateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - birth.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return parseFloat((diffDays / 30.4).toFixed(1)); // Edad en meses aproximada
    };

    const timeAgo = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            return formatDistanceToNow(new Date(dateStr), { locale: es, addSuffix: true });
        } catch (e) {
            return '';
        }
    };

    const speakMessage = (text: string) => {
        window.speechSynthesis.cancel();
        // Remove formatting code or tips block to speak only the textual response
        const cleanText = text.replace(/TIP_TITLE:[\s\S]*/, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';

        const voice = lunaVoice || 'soprano';
        if (voice === 'soprano') {
            utterance.pitch = 1.4;
            utterance.rate = 1.0;
        } else if (voice === 'contralto') {
            utterance.pitch = 0.8;
            utterance.rate = 0.9;
        } else if (voice === 'narrador') {
            utterance.pitch = 0.6;
            utterance.rate = 0.8;
        }

        window.speechSynthesis.speak(utterance);
    };

    const fetchConversation = useCallback(async () => {
        if (!selectedBaby) return;
        const { data } = await dbHelpers.getAiConversations(selectedBaby.id, 50);
        if (data) {
            setMessages(data as Message[]);
        }
    }, [selectedBaby]);

    const fetchSettings = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await dbHelpers.getUserSettings(user.id);
            if (data) {
                if (data.luna_icon) {
                    localStorage.setItem('luna_icon', data.luna_icon);
                    setLunaIconUrl(data.luna_icon);
                }
                if (data.luna_profile) {
                    localStorage.setItem('luna_profile', data.luna_profile);
                    setLunaProfile(data.luna_profile);
                }
                if (data.luna_frequency) {
                    localStorage.setItem('luna_frequency', data.luna_frequency);
                    setLunaFrequency(data.luna_frequency);
                }
                if (data.luna_voice) {
                    localStorage.setItem('luna_voice', data.luna_voice);
                    setLunaVoice(data.luna_voice);
                }
            }
        } catch (e) {
            console.error("Error al obtener los ajustes de Luna:", e);
        }
    }, [user]);

    // Fetch conversation when modal opens or baby changes
    useEffect(() => {
        if (isOpen && selectedBaby) {
            fetchConversation();
            fetchSettings();
        }
    }, [isOpen, selectedBaby, fetchConversation, fetchSettings]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        const handleSettingsUpdate = () => {
            setLunaIconUrl(localStorage.getItem('luna_icon') || '/luna-avatar.png');
            setLunaProfile(localStorage.getItem('luna_profile') || 'serena');
            setLunaFrequency(localStorage.getItem('luna_frequency') || 'balanced');
            setLunaVoice(localStorage.getItem('luna_voice') || 'soprano');
        };
        window.addEventListener('luna-settings-updated', handleSettingsUpdate);
        return () => window.removeEventListener('luna-settings-updated', handleSettingsUpdate);
    }, []);

    const toggleListen = () => {
        const WindowAny = window as unknown as WindowWithSpeech;
        const SpeechRecognition = WindowAny.SpeechRecognition || WindowAny.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            alert('El reconocimiento de voz no está soportado en este navegador.');
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                (recognitionRef.current as any).stop();
            }
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition as unknown as any;

        recognition.lang = 'es-ES';
        recognition.interimResults = true;

        const currentInput = input;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: SpeechRecognitionEvent) => {
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

    const handleClearChat = async () => {
        if (!selectedBaby || !window.confirm('¿Estás seguro de que quieres limpiar la conversación?')) return;
        
        const { error } = await dbHelpers.deleteAiConversations(selectedBaby.id);
        if (!error) {
            setMessages([]);
        } else {
            console.error('Error al limpiar el chat:', error);
            alert('No se pudo limpiar el chat. Intenta de nuevo.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
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
        const currentImage = selectedImage;

        if (!userText && !currentImage) return;
        if (!user || !selectedBaby || isLoading) return;

        if (!manualText) setInput('');
        setSelectedImage(null);

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

            // 1. Fetch latest stats and logs for the baby in parallel to inject context!
            const [diets, diapers, sleeps, solids, growths, temperatures, medicines, activities] = await Promise.all([
                dbHelpers.getDiets(selectedBaby.id),
                dbHelpers.getDiapers(selectedBaby.id),
                dbHelpers.getSleepLogs(selectedBaby.id),
                dbHelpers.getSolids(selectedBaby.id),
                dbHelpers.getGrowth(selectedBaby.id),
                dbHelpers.getTemperature(selectedBaby.id),
                dbHelpers.getMedicine(selectedBaby.id),
                dbHelpers.getActivity(selectedBaby.id)
            ]);

            const ageMonths = selectedBaby.birth_date ? getBabyAgeInMonths(selectedBaby.birth_date) : 0;
            
            let babyContextText = `
INFORMACIÓN DEL BEBÉ SELECCIONADO:
- Nombre: ${selectedBaby.name}
- Género: ${selectedBaby.gender || 'No especificado'}
- Fecha de nacimiento: ${selectedBaby.birth_date || 'No especificada'} (Edad: ${ageMonths} meses)
- Peso base: ${selectedBaby.weight || 'No especificado'} kg
- Altura base: ${selectedBaby.height || 'No especificado'} cm

FECHA Y HORA ACTUAL DEL SISTEMA:
- ${new Date().toLocaleString('es-ES', { timeZoneName: 'short' })}

REGISTROS RECIENTES EN LA BITÁCORA:
`;

            // Dieta y Sólidos
            babyContextText += `\n* ALIMENTOS:\n`;
            const recentDiets = (diets.data || []).slice(0, 3);
            const recentSolids = (solids.data || []).slice(0, 3);
            if (recentDiets.length === 0 && recentSolids.length === 0) {
                babyContextText += "  - No hay registros de alimentación recientes.\n";
            } else {
                recentDiets.forEach(d => {
                    babyContextText += `  - [Líquido] Tipo: ${d.type}, Cantidad: ${d.amount} ml/min, Notas: ${d.observations || 'ninguna'}, Hace ${timeAgo(d.created_at)} (${new Date(d.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})\n`;
                });
                recentSolids.forEach(s => {
                    babyContextText += `  - [Sólido] Alimentos: ${s.foods?.join(', ') || 'alimento'}, Cantidad: ${s.amount || 'no especificada'}, Notas: ${s.observations || 'ninguna'}, Hace ${timeAgo(s.created_at)} (${new Date(s.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})\n`;
                });
            }

            // Sueño
            babyContextText += `\n* SUEÑO:\n`;
            const recentSleeps = (sleeps.data || []).slice(0, 3);
            if (recentSleeps.length === 0) {
                babyContextText += "  - No hay registros de sueño recientes.\n";
            } else {
                recentSleeps.forEach(s => {
                    const startStr = new Date(s.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    const endStr = new Date(s.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    babyContextText += `  - Duración: ${s.duration} min (De ${startStr} a ${endStr}), Notas: ${s.observations || 'ninguna'}, Hace ${timeAgo(s.end_time)}\n`;
                });
            }

            // Pañales
            babyContextText += `\n* PAÑALES:\n`;
            const recentDiapers = (diapers.data || []).slice(0, 3);
            if (recentDiapers.length === 0) {
                babyContextText += "  - No hay registros de pañales recientes.\n";
            } else {
                recentDiapers.forEach(dp => {
                    babyContextText += `  - Estado: Pañal ${dp.status}, Notas: ${dp.observations || 'ninguna'}, Hace ${timeAgo(dp.created_at)} (${new Date(dp.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})\n`;
                });
            }

            // Salud
            babyContextText += `\n* SALUD (Medicamentos, Temperatura, Crecimiento):\n`;
            const recentGrowth = (growths.data || []).slice(0, 2);
            const recentTemp = (temperatures.data || []).slice(0, 2);
            const recentMed = (medicines.data || []).slice(0, 2);
            if (recentGrowth.length === 0 && recentTemp.length === 0 && recentMed.length === 0) {
                babyContextText += "  - No hay registros de salud recientes.\n";
            } else {
                recentGrowth.forEach(g => {
                    babyContextText += `  - Crecimiento: Peso ${g.weight} kg, Altura ${g.height} cm, Perímetro cefálico: ${g.head_circumference || 'no reg'} cm, Hace ${timeAgo(g.created_at)}\n`;
                });
                recentTemp.forEach(t => {
                    babyContextText += `  - Temperatura: ${t.temperature}°${t.unit}, Hace ${timeAgo(t.created_at)}\n`;
                });
                recentMed.forEach(m => {
                    babyContextText += `  - Medicamento: ${m.name}, Dosis: ${m.dosage || 'no reg'}, Notas: ${m.observations || 'ninguna'}, Hace ${timeAgo(m.created_at)}\n`;
                });
            }

            // Actividades
            babyContextText += `\n* ACTIVIDADES:\n`;
            const recentActivities = (activities.data || []).slice(0, 2);
            if (recentActivities.length === 0) {
                babyContextText += "  - No hay registros de actividades recientes.\n";
            } else {
                recentActivities.forEach(a => {
                    babyContextText += `  - Actividad: ${a.activity_type}, Duración: ${a.duration_minutes} min, Notas: ${a.observations || 'ninguna'}, Hace ${timeAgo(a.created_at)}\n`;
                });
            }

            const chatHistory = messages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
                parts: [{ text: msg.content }]
            }));

            let imageParts: { inlineData: { data: string, mimeType: string } }[] = [];
            if (currentImage) {
                imageParts.push({
                    inlineData: {
                        data: currentImage.base64,
                        mimeType: currentImage.file.type
                    }
                });
            }

            const { geminiHelpers } = await import('../lib/gemini');
            const result = await geminiHelpers.sendMessageWithContext(
                userText || "Analiza esta imagen.",
                chatHistory,
                babyContextText,
                imageParts.length > 0 ? imageParts : undefined,
                lunaProfile as 'serena' | 'activa',
                lunaFrequency as 'occasional' | 'balanced' | 'frequent'
            );

            let didAction = false;
            let shouldCloseChat = false;

            if (result.actions && result.actions.length > 0) {
                for (const action of result.actions) {
                    try {
                        const args = action.args as Record<string, any>;
                        
                        if (action.name === 'logAddBaby') {
                            await dbHelpers.upsertBabyProfile({
                                user_id: user.id,
                                name: args.name as string,
                                gender: (args.gender as string) || 'niño',
                                birth_date: (args.birthDate as string) || new Date().toISOString().split('T')[0],
                                weight: (args.weight as number) || 0,
                                height: (args.height as number) || 0
                            });
                            await fetchBabies();
                            didAction = true;
                        } else if (action.name === 'logBabySleep') {
                            await dbHelpers.insertSleepLog({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                start_time: new Date(Date.now() - ((args.durationMinutes as number) * 60000)).toISOString(),
                                end_time: new Date().toISOString(),
                                duration: (args.durationMinutes as number).toString()
                            });
                            didAction = true;
                        } else if (action.name === 'logBabyDiaper') {
                            await dbHelpers.insertDiaper({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                status: args.status as string,
                                observations: (args.observations as string) || ''
                            });
                            didAction = true;
                        } else if (action.name === 'logBabyDiet') {
                            await dbHelpers.insertDiet({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                type: args.type as string,
                                amount: (args.amount as number) || 0,
                                observations: (args.observations as string) || ''
                            });
                            didAction = true;
                        } else if (action.name === 'logBabySolids') {
                            await dbHelpers.insertSolids({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                foods: (args.foods as string[]) || [],
                                amount: (args.amount as string) || '',
                                observations: (args.observations as string) || ''
                            });
                            didAction = true;
                        } else if (action.name === 'logBabyMedicine') {
                            await dbHelpers.insertMedicine({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                name: args.name as string,
                                dosage: (args.dosage as string) || '',
                                observations: (args.observations as string) || ''
                            });
                            didAction = true;
                        } else if (action.name === 'logBabyGrowth') {
                            await dbHelpers.insertGrowth({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                weight: (args.weight as number) || 0,
                                height: (args.height as number) || 0,
                                head_circumference: (args.headCircumference as number) || undefined
                            });
                            didAction = true;
                        } else if (action.name === 'logBabyTemperature') {
                            await dbHelpers.insertTemperature({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                temperature: (args.temperature as number) || 0,
                                unit: (args.unit as string) || 'C'
                            });
                            didAction = true;
                        } else if (action.name === 'logBabyActivity') {
                            await dbHelpers.insertActivity({
                                user_id: user.id,
                                baby_id: selectedBaby.id,
                                activity_type: args.activityType as string,
                                duration_minutes: (args.durationMinutes as number) || 0,
                                observations: (args.observations as string) || ''
                            });
                            didAction = true;
                        } else if (action.name === 'logUpdateBaby') {
                            await dbHelpers.upsertBabyProfile({
                                id: selectedBaby.id,
                                user_id: user.id,
                                name: selectedBaby.name,
                                birth_date: selectedBaby.birth_date,
                                weight: (args.weight as number) || selectedBaby.weight,
                                height: (args.height as number) || selectedBaby.height
                            });
                            await fetchBabies();
                            didAction = true;
                        } else if (action.name === 'logDeleteBaby') {
                            await dbHelpers.deleteBabyProfile(args.babyId || selectedBaby.id, user.id);
                            await fetchBabies();
                            shouldCloseChat = true;
                            didAction = true;
                        }
                    } catch (err) {
                        console.error("Error ejecutando acción de Luna:", err);
                    }
                }
            }

            // Determine final response text
            let responseText = result.text || '';

            if (!responseText && didAction) {
                responseText = '\u00a1Listo! Ya guard\u00e9 eso en la bit\u00e1cora de ' + selectedBaby.name + ' \u2728';
            }

            if (!responseText && result.error) {
                responseText = 'Hubo un problema al conectar con el servicio. Verifica tu conexi\u00f3n e intenta de nuevo.';
            }

            if (!responseText) {
                // Gemini returned nothing at all — fallback graceful response
                responseText = '\u00a1Hola! Estoy aqu\u00ed para ayudarte con ' + (selectedBaby?.name || 'tu beb\u00e9') + '. \u00bfEn qu\u00e9 puedo ayudarte?';
            }

            const assistantMsgId = (Date.now() + 1).toString();
            const assistantMessage: Message = {
                id: assistantMsgId,
                role: 'assistant',
                content: responseText,
                created_at: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Persist to DB
            try {
                await dbHelpers.insertAiMessage({
                    user_id: user.id,
                    baby_id: selectedBaby.id,
                    role: 'assistant',
                    content: responseText
                });
            } catch (dbErr) {
                console.warn('No se pudo guardar el mensaje de Luna en BD:', dbErr);
            }

            if (didAction) {
                window.dispatchEvent(new CustomEvent('luna-action-completed'));
            }

            if (shouldCloseChat) {
                onClose();
            }
        } catch (error: any) {
            console.error('Error en la conversaci\u00f3n de Luna:', error);
            // Show error message to user
            const errorMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: 'Lo siento, tuve un problema al procesar tu mensaje. \u00bfPuedes intentarlo de nuevo?',
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-background-light dark:bg-[#0a110c] text-slate-900 dark:text-slate-100 flex flex-col animate-fade-in font-chat" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background-light/90 dark:bg-[#0a110c]/90 backdrop-blur-xl px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#8c2bee]/15">
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-primary">arrow_back_ios_new</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">auto_awesome</span>
                    <h1 className="text-lg font-bold tracking-tight">
                        Luna {lunaProfile === 'serena' ? 'Noche Serena' : 'Día Activo'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleClearChat}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-500/10 transition-colors text-red-500"
                        title="Limpiar conversación"
                    >
                        <span className="material-symbols-outlined">delete_sweep</span>
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-primary">more_vert</span>
                    </button>
                </div>
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
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[10px] text-slate-500 ${isLuna ? 'ml-1' : 'mr-1'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isLuna && (
                                        <button
                                            onClick={() => speakMessage(displayText)}
                                            className="text-slate-400 hover:text-[#8c2bee] transition-colors p-0.5 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-850"
                                            title="Escuchar mensaje"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">volume_up</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex items-start gap-3 max-w-[85%] animate-pulse">
                        <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 mt-1 overflow-hidden animate-spin">
                            <span className="material-symbols-outlined text-primary text-[32px]">auto_awesome</span>
                        </div>
                        <div className="bg-white dark:bg-[#1a251b] p-4 rounded-xl rounded-tl-none message-shadow text-sm text-slate-400">Luna está analizando la bitácora y pensando...</div>
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
