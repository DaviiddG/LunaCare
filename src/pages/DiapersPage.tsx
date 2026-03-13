import { useState, useEffect, useCallback } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { useBabies } from '../hooks/useBabies';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const CloudBackground = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[70%] h-[70%] bg-blue-100/30 dark:bg-blue-900/10 blur-[130px] rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#FDF2F8]/30 dark:bg-[#FDF2F8]/5 blur-[110px] rounded-full animate-pulse" style={{ animationDuration: '15s' }} />
        <div className="absolute top-[20%] right-[5%] w-[45%] h-[45%] bg-blue-50/20 dark:bg-slate-800/10 blur-[90px] rounded-full" />
    </div>
);

export function DiapersPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedBaby } = useBabies();

    const [diaperType, setDiaperType] = useState<'Pipi' | 'Popo' | null>(null);
    const [consistency, setConsistency] = useState<'Normal' | 'Líquida' | 'Dura' | null>(null);
    const [color, setColor] = useState<'Amarillo' | 'Marrón' | 'Verde' | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [insightText, setInsightText] = useState('Analizando pañales hoy...');
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');

    useEffect(() => {
        const handleSync = () => setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        window.addEventListener('luna-settings-updated', handleSync);
        return () => window.removeEventListener('luna-settings-updated', handleSync);
    }, []);

    const fetchInsight = useCallback(async (babyId: string) => {
        setInsightText('Analizando pañales hoy...');
        try {
            const { data } = await dbHelpers.getDiapers(babyId);
            if (data) {
                const todayCount = data.filter((d: any) => new Date(d.created_at).toDateString() === new Date().toDateString()).length;
                const context = `El bebé tiene ${todayCount} pañales registrados hoy.`;
                const { geminiHelpers } = await import('../lib/gemini');
                const prompt = `Da un consejo MUY CORTO (1 línea) empático sobre cambio de pañales (van ${todayCount} hoy). Menciona la higiene o comodidad. NO uses negritas.`;
                const res = await geminiHelpers.sendMessageWithContext(prompt, [{ role: 'user' as const, parts: [{ text: prompt }] }], context);
                if (res.text) setInsightText(res.text.replace(/\*/g, ''));
            }
        } catch (e) {
            setInsightText('¡Higiene es felicidad! ✨');
        }
    }, []);

    useEffect(() => {
        if (selectedBaby) {
            fetchInsight(selectedBaby.id);
            setDiaperType(null);
            setConsistency(null);
            setColor(null);
            setNotes('');
        }
    }, [selectedBaby, fetchInsight]);

    const handleSave = async () => {
        if (!user || !selectedBaby || !diaperType) return;
        setLoading(true);

        let fullStatus = diaperType;
        if (diaperType === 'Popo') {
            const extras: string[] = [];
            if (consistency) extras.push(consistency);
            if (color) extras.push(color);
            if (extras.length > 0) fullStatus += ` (${extras.join(', ')})`;
        }

        const { error } = await dbHelpers.insertDiaper({
            status: fullStatus,
            observations: notes,
            user_id: user.id,
            baby_id: selectedBaby.id
        });

        if (!error) {
            window.dispatchEvent(new CustomEvent('luna-action-completed'));
            navigate('/');
        }
        setLoading(false);
    };

    return (
        <div className="relative bg-[#F8FAFC] dark:bg-[#050811] min-h-screen pb-32 font-['Manrope',sans-serif] text-slate-900 dark:text-white selection:bg-blue-200/30 overflow-x-hidden">
            <CloudBackground />

            {/* Content Container */}
            <div className="relative z-10 max-w-lg mx-auto px-5">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center py-7 justify-between"
                >
                    <button
                        onClick={() => navigate('/')}
                        className="flex size-11 items-center justify-center rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl hover:bg-white/60 dark:hover:bg-white/10 active:scale-95 transition-all shadow-sm"
                    >
                        <span className="material-symbols-rounded text-slate-700 dark:text-white/70">close</span>
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1">Cuidado Infantil</span>
                        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Registro Pañal</h2>
                    </div>
                    <div className="size-11" />
                </motion.div>

                {/* Premium Luna Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative mb-8"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-[2rem] blur-xl opacity-50 dark:opacity-20" />
                    <div className="relative p-5 rounded-[2rem] bg-white/40 dark:bg-white/[0.03] border border-white dark:border-white/10 backdrop-blur-2xl overflow-hidden group shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-symbols-rounded text-6xl text-blue-400">soap</span>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="size-14 shrink-0 rounded-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden shadow-lg relative">
                                <img src={lunaIcon} alt="Luna AI" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Asistente Luna</span>
                                <p className="text-sm font-bold leading-relaxed text-slate-700 dark:text-white/80">{insightText}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Diaper Type Selection */}
                <div className="mb-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1 mb-4 block">Estado del Pañal</span>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: 'Pipi', icon: 'water_drop', color: 'blue', label: 'Pipi', bg: 'bg-blue-50/50', text: 'text-blue-600', border: 'border-blue-200' },
                            { id: 'Popo', icon: 'cookie', color: 'amber', label: 'Popo', bg: 'bg-amber-50/50', text: 'text-amber-700', border: 'border-amber-200' }
                        ].map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setDiaperType(type.id as any)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-[3px] transition-all duration-500 group overflow-hidden",
                                    diaperType === type.id 
                                        ? cn("bg-white dark:bg-white/10 shadow-2xl scale-105 z-10", type.border) 
                                        : "bg-white/30 dark:bg-white/5 border-white dark:border-white/5 opacity-60 hover:opacity-100"
                                )}
                            >
                                {diaperType === type.id && (
                                    <motion.div 
                                        layoutId="diaper-bg"
                                        className={cn("absolute inset-0 opacity-10", type.bg)}
                                    />
                                )}
                                <span className={cn(
                                    "material-symbols-rounded text-5xl mb-3 transition-transform duration-500 group-hover:scale-110 relative z-10",
                                    type.text
                                )}>
                                    {type.icon}
                                </span>
                                <span className={cn("text-xs font-black uppercase tracking-[0.2em] relative z-10", type.text)}>
                                    {type.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Popo details */}
                {diaperType === 'Popo' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8 mb-10"
                    >
                        {/* Consistency */}
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1 mb-4 block">Consistencia</span>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'Normal', icon: 'check_circle' },
                                    { id: 'Líquida', icon: 'waves' },
                                    { id: 'Dura', icon: 'fiber_manual_record' }
                                ].map((cons) => (
                                    <button
                                        key={cons.id}
                                        onClick={() => setConsistency(cons.id as any)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-3xl transition-all border-2",
                                            consistency === cons.id 
                                                ? "bg-slate-900 dark:bg-white text-white dark:text-black border-transparent shadow-xl" 
                                                : "bg-white/40 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-400"
                                        )}
                                    >
                                        <span className="material-symbols-rounded text-xl mb-1">{cons.icon}</span>
                                        <span className="text-[10px] font-black uppercase tracking-tight">{cons.id}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color */}
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1 mb-4 block">Color</span>
                            <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-white/40 dark:bg-white/5 border border-white dark:border-white/10 backdrop-blur-xl">
                                {[
                                    { id: 'Amarillo', hex: '#FFD54F' },
                                    { id: 'Marrón', hex: '#8D6E63' },
                                    { id: 'Verde', hex: '#9CCC65' }
                                ].map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setColor(c.id as any)}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="relative">
                                            <div 
                                                style={{ backgroundColor: c.hex }}
                                                className={cn(
                                                    "size-12 rounded-full border-4 border-white dark:border-slate-800 shadow-lg transition-transform duration-300 group-hover:scale-110",
                                                    color === c.id ? "ring-4 ring-blue-400/30" : ""
                                                )}
                                            />
                                            {color === c.id && (
                                                <motion.div 
                                                    layoutId="color-check"
                                                    className="absolute -top-1 -right-1 size-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white"
                                                >
                                                    <span className="material-symbols-rounded text-[10px] text-white">check</span>
                                                </motion.div>
                                            )}
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">{c.id}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Integrated Action Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-8 pb-10 rounded-[3.5rem] bg-white/40 dark:bg-white/[0.02] border border-white dark:border-white/10 backdrop-blur-3xl shadow-[0_30px_70px_rgba(57,148,239,0.15)] dark:shadow-none mb-10"
                >
                    <div className="flex items-center gap-2 mb-6 px-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-700 dark:text-white/30">Higiene y Confort</span>
                    </div>

                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-[2.5rem] p-7 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all font-medium text-sm shadow-inner min-h-[140px] resize-none mb-10"
                        placeholder="Cambio rápido, pomada usada, erupción..."
                    />

                    <button
                        onClick={handleSave}
                        disabled={loading || !diaperType || !selectedBaby}
                        className={cn(
                            "group relative w-full h-24 rounded-[2.5rem] font-black uppercase tracking-widest text-xs transition-all duration-700 shadow-2xl overflow-hidden active:scale-95 flex items-center justify-center gap-5",
                            diaperType 
                                ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-[0_20px_50px_rgba(57,148,239,0.25)]" 
                                : "bg-white/40 text-slate-400 border border-slate-200 dark:bg-white/5 dark:border-white/10 shadow-none disabled:opacity-50"
                        )}
                    >
                        <div className="absolute inset-0 bg-white/10 dark:bg-slate-100/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <motion.span 
                            animate={{ rotate: [0, 10, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="material-symbols-rounded text-3xl"
                        >
                            {diaperType === 'Pipi' ? 'clean_hands' : (diaperType === 'Popo' ? 'shutter_speed' : 'task_alt')}
                        </motion.span>
                        <span className="relative z-10 text-base tracking-[0.1em]">
                            {loading ? 'Limpiando...' : 'Finalizar Registro'}
                        </span>
                        
                        {/* Glow Aura */}
                        <div className="absolute inset-0 bg-blue-400/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    
                    {/* Visual Hint for Depth */}
                    <div className="mt-4 flex justify-center opacity-20">
                        <div className="w-12 h-1 bg-blue-400 rounded-full" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
