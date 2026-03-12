import { useState } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';

interface LunaSettings {
    profile: 'serena' | 'activa';
    frequency: 'occasional' | 'balanced' | 'frequent';
    voice: 'soprano' | 'contralto' | 'narrador';
    icon: string;
}

interface LunaSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: LunaSettings) => void;
}

export function LunaSettingsModal({ isOpen, onClose, onSave }: LunaSettingsModalProps) {
    const [settings, setSettings] = useState<LunaSettings>({
        profile: (localStorage.getItem('luna_profile') as any) || 'serena',
        frequency: (localStorage.getItem('luna_frequency') as any) || 'balanced',
        voice: (localStorage.getItem('luna_voice') as any) || 'soprano',
        icon: localStorage.getItem('luna_icon') || '/luna-avatar.png'
    });
    const { user } = useAuth();

    const handleSave = async () => {
        // Save to localStorage for immediate availability/legacy sync
        localStorage.setItem('luna_profile', settings.profile);
        localStorage.setItem('luna_frequency', settings.frequency);
        localStorage.setItem('luna_voice', settings.voice);
        localStorage.setItem('luna_icon', settings.icon);

        // Save to database for cross-device sync
        if (user) {
            await dbHelpers.updateUserSettings(user.id, {
                luna_profile: settings.profile,
                luna_frequency: settings.frequency,
                luna_voice: settings.voice,
                luna_icon: settings.icon
            });
        }

        // Dispatch event so the Dashboard (and other listeners) can update immediately
        window.dispatchEvent(new CustomEvent('luna-settings-updated'));

        onSave(settings);
    };

    const playVoiceSample = (voice: string) => {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const text = settings.profile === 'serena'
            ? "Hola, soy Luna. Estoy aquí para ayudarte con el cuidado de tu bebé con mucha dulzura."
            : "¡Hola! Soy Luna en modo activo. Vamos a organizar el día de tu bebé de forma eficiente.";

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';

        // Map voices to pitch/rate for variety
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-background-light dark:bg-[#0a110c] text-slate-900 dark:text-slate-100 flex flex-col animate-fade-in font-chat overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-background-light/80 dark:bg-[#0a110c]/80 backdrop-blur-md border-b border-[#8c2bee]/10 px-4 py-4 flex items-center justify-between mt-8">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-[#8c2bee]/10 rounded-full transition-colors active:scale-90">
                        <span className="material-symbols-outlined text-2xl text-[#8c2bee]">arrow_back_ios_new</span>
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Configuración Rápida</h1>
                </div>
                <button
                    onClick={handleSave}
                    className="text-white font-bold text-sm px-4 py-2 rounded-full bg-[#8c2bee] hover:bg-[#7b24d6] shadow-md transition-all active:scale-95"
                >
                    Guardar
                </button>
            </div>

            <main className="flex-1 overflow-y-auto pb-32 px-4 scrollbar-hide bg-background-light dark:bg-[#0a110c]">
                {/* Preview Section */}
                <div className="flex flex-col items-center py-8 bg-gradient-to-b from-[#8c2bee]/10 to-transparent rounded-b-[3rem] mb-6 shadow-sm border-b border-[#8c2bee]/5">
                    <div className="relative mb-6 group">
                        <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-[#8c2bee]/40 to-indigo-400/30 flex items-center justify-center border-4 border-white dark:border-slate-800 relative overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-105">
                            <img
                                src={settings.profile === 'serena' ? 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=400&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=400&auto=format&fit=crop'}
                                className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-soft-light"
                                alt="Fondo"
                            />
                            <img
                                src={settings.icon}
                                className="relative z-10 w-28 h-28 rounded-full border-2 border-white/80 object-cover shadow-lg"
                                alt="Luna"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a110c]/60 via-transparent to-transparent"></div>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-primary w-7 h-7 rounded-full border-4 border-white dark:border-[#0a110c] flex items-center justify-center shadow-lg">
                            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-5 rounded-3xl rounded-tl-none shadow-xl border border-white/20 dark:border-slate-700/50 max-w-[280px] relative">
                        <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-200 italic text-center">
                            {settings.profile === 'serena'
                                ? '¡Hola cariño! He preparado unos ajustes ideales para que tu noche sea mágica y tranquila. ✨'
                                : '¡Hey! Tengo todo listo para un día súper productivo. ¡Vamos a darle con todo! 🚀'}
                        </p>
                    </div>
                    <p className="mt-5 text-[10px] font-bold text-[#8c2bee] uppercase tracking-[0.2em] opacity-70">Vista previa actual</p>
                </div>

                <div className="space-y-10">
                    {/* Profiles Section */}
                    <section>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#8c2bee]">auto_awesome</span>
                            Perfiles de Luna
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {/* Profile Serena */}
                            <div
                                onClick={() => setSettings({ ...settings, profile: 'serena' })}
                                className={`relative cursor-pointer overflow-hidden rounded-3xl border-2 transition-all ${settings.profile === 'serena' ? 'border-[#8c2bee] ring-4 ring-[#8c2bee]/10' : 'border-transparent bg-slate-100 dark:bg-slate-800/40'}`}
                            >
                                <div className="h-28 bg-gradient-to-r from-indigo-950 to-slate-900 relative">
                                    <img
                                        src="https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop"
                                        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
                                        alt="Noche"
                                    />
                                    <div className="absolute top-4 left-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border-2 border-[#8c2bee]/50 bg-indigo-500/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#8c2bee]">dark_mode</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm">Luna Noche Serena</h3>
                                            <p className="text-[10px] text-indigo-100 uppercase tracking-wider">Cariñosa & Tenue</p>
                                        </div>
                                    </div>
                                    {settings.profile === 'serena' && (
                                        <div className="absolute top-4 right-4">
                                            <span className="material-symbols-outlined text-[#8c2bee] bg-white rounded-full fill-[1] text-xl">check_circle</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800">
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Perfecta para el descanso. Tono suave y consejos pausados.</p>
                                </div>
                            </div>

                            {/* Profile Activa */}
                            <div
                                onClick={() => setSettings({ ...settings, profile: 'activa' })}
                                className={`relative cursor-pointer overflow-hidden rounded-3xl border-2 transition-all ${settings.profile === 'activa' ? 'border-[#8c2bee] ring-4 ring-[#8c2bee]/10' : 'border-transparent bg-slate-100 dark:bg-slate-800/40'}`}
                            >
                                <div className="h-28 bg-gradient-to-r from-sky-400 to-amber-200 relative">
                                    <img
                                        src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop"
                                        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
                                        alt="Día"
                                    />
                                    <div className="absolute top-4 left-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border-2 border-amber-500/50 bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                            <span className="material-symbols-outlined">light_mode</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">Luna Día Activo</h3>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Directa & Energética</p>
                                        </div>
                                    </div>
                                    {settings.profile === 'activa' && (
                                        <div className="absolute top-4 right-4">
                                            <span className="material-symbols-outlined text-[#8c2bee] bg-white rounded-full fill-[1] text-xl">check_circle</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800">
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Ideal para el día. Tono dinámico y recordatorios precisos.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Frequency Section */}
                    <section>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#8c2bee]">notifications_active</span>
                            Frecuencia de Consejos
                        </h2>
                        <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800/40 p-1.5 rounded-2xl">
                            {(['occasional', 'balanced', 'frequent'] as const).map((freq) => (
                                <button
                                    key={freq}
                                    onClick={() => setSettings({ ...settings, frequency: freq })}
                                    className={`py-3 px-1 rounded-xl text-xs font-bold transition-all ${settings.frequency === freq
                                        ? 'bg-white dark:bg-slate-700 text-[#8c2bee] shadow-sm border border-slate-200 dark:border-slate-600'
                                        : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
                                >
                                    {freq === 'occasional' ? 'Ocasional' : freq === 'balanced' ? 'Equilibrada' : 'Frecuente'}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Voice Section */}
                    <section className="mb-12">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#8c2bee]">record_voice_over</span>
                            Voz de Luna
                        </h2>
                        <div className="space-y-3">
                            {(['soprano', 'contralto', 'narrador'] as const).map((v) => (
                                <div
                                    key={v}
                                    onClick={() => setSettings({ ...settings, voice: v })}
                                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${settings.voice === v
                                        ? 'bg-white dark:bg-slate-800/40 border-[#8c2bee] ring-4 ring-[#8c2bee]/5'
                                        : 'bg-slate-100 dark:bg-slate-800/40 border-transparent'}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold text-sm truncate ${settings.voice === v ? '' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {v === 'soprano' ? 'Soprano Suave' : v === 'contralto' ? 'Contralto Cálido' : 'Narrador Relajante'}
                                        </p>
                                        <p className="text-[10px] text-slate-500">{v === 'soprano' ? 'Predeterminado' : 'Efecto natural'}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            playVoiceSample(v);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${settings.voice === v
                                            ? 'bg-[#8c2bee]/10 text-[#8c2bee] border-[#8c2bee]/20'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-transparent'}`}>
                                        <span className="material-symbols-outlined text-lg">play_circle</span>
                                        <span className="text-xs font-bold italic">Escuchar</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
