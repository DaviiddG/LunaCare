import { useState, useEffect, useCallback } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { useBabies } from '../hooks/useBabies';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const FlowGradient = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FFDAB9]/15 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-5%] right-[-10%] w-[60%] h-[60%] bg-[#FFC0CB]/10 blur-[130px] rounded-full animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-white dark:bg-white/5 blur-[90px] rounded-full" />
    </div>
);

export function DietPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedBaby } = useBabies();

    const [leftTime, setLeftTime] = useState(0); 
    const [rightTime, setRightTime] = useState(0); 
    const [activeTimer, setActiveTimer] = useState<'left' | 'right' | null>(null);
    const [isManual, setIsManual] = useState(false);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [insightText, setInsightText] = useState('Analizando rutinas de lactancia...');
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');

    useEffect(() => {
        const handleSync = () => setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        window.addEventListener('luna-settings-updated', handleSync);
        return () => window.removeEventListener('luna-settings-updated', handleSync);
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (activeTimer === 'left') {
            interval = setInterval(() => setLeftTime(t => t + 1), 1000);
        } else if (activeTimer === 'right') {
            interval = setInterval(() => setRightTime(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [activeTimer]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const totalTime = leftTime + rightTime;

    const toggleTimer = (side: 'left' | 'right') => {
        if (isManual) return;
        setActiveTimer(prev => prev === side ? null : side);
    };

    const handleManualChange = (side: 'left' | 'right', minutes: string) => {
        const mins = parseInt(minutes) || 0;
        if (side === 'left') setLeftTime(mins * 60);
        if (side === 'right') setRightTime(mins * 60);
    };

    const fetchInsight = useCallback(async (babyId: string) => {
        setInsightText('Analizando rutinas de lactancia...');
        const { data } = await dbHelpers.getDiets(babyId);
        if (data) {
            const breastDiets = data.filter((d: any) => d.type === 'breast');
            const context = breastDiets.length > 0
                ? `El bebé ha tomado pecho ${breastDiets.length} veces registradas.`
                : 'No hay registros previos de pecho.';

            const { geminiHelpers } = await import('../lib/gemini');
            const prompt = `Da un consejo MUY CORTO (1 línea) empático sobre lactancia para el bebé ${selectedBaby?.name}. Menciona un tip de apego. NO uses negritas ni markdown.`;
            const res = await geminiHelpers.sendMessageWithContext(prompt, [], context);
            if (res.text) setInsightText(res.text.replace(/\*/g, ''));
        }
    }, [selectedBaby?.name]);

    useEffect(() => {
        if (selectedBaby) {
            fetchInsight(selectedBaby.id);
            setActiveTimer(null);
            setLeftTime(0);
            setRightTime(0);
            setNotes('');
        }
    }, [selectedBaby, fetchInsight]);

    const handleSave = async () => {
        if (!user || !selectedBaby || totalTime === 0) return;
        setLoading(true);
        setActiveTimer(null);

        const observations = `Izquierdo: ${formatTime(leftTime)}, Derecho: ${formatTime(rightTime)}. ${notes}`.trim();
        const amountMinutes = Math.round(totalTime / 60);

        const { error } = await dbHelpers.insertDiet({
            type: 'breast',
            amount: amountMinutes,
            observations: observations,
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
        <div className="relative bg-[#FFFAF0] dark:bg-[#0A0C10] min-h-screen pb-32 font-['Manrope',sans-serif] text-slate-900 dark:text-white selection:bg-[#FFDAB9]/30 overflow-x-hidden">
            <FlowGradient />

            {/* Content Container */}
            <div className="relative z-10 max-w-lg mx-auto px-5">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center py-7 justify-between transition-all"
                >
                    <button
                        onClick={() => navigate('/')}
                        className="flex size-11 items-center justify-center rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl hover:bg-white/60 dark:hover:bg-white/10 active:scale-95 transition-all shadow-sm"
                    >
                        <span className="material-symbols-rounded text-slate-700 dark:text-white/70">arrow_back_ios_new</span>
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D2691E] dark:text-[#FFDAB9] mb-1">Vínculo Vital</span>
                        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Lactancia</h2>
                    </div>
                    <div className="size-11" />
                </motion.div>

                {/* Premium Luna Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative mb-10"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FFDAB9]/30 to-[#FFC0CB]/30 rounded-[2rem] blur-xl opacity-50 dark:opacity-20" />
                    <div className="relative p-5 rounded-[2rem] bg-white/60 dark:bg-white/[0.03] border border-white/40 dark:border-white/10 backdrop-blur-2xl overflow-hidden group shadow-xl shadow-[#FFDAB9]/20 dark:shadow-none">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-rounded text-6xl text-[#FFDAB9]">favorite</span>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="size-14 shrink-0 rounded-2xl border-2 border-white/40 dark:border-white/10 overflow-hidden shadow-lg relative">
                                <img src={lunaIcon} alt="Luna AI" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#D2691E] dark:text-[#FFDAB9]">Luna AI</span>
                                <p className="text-sm font-bold leading-relaxed text-slate-900 dark:text-white/80">
                                    {insightText}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Interaction Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative p-8 pb-12 rounded-[3.5rem] bg-white/40 dark:bg-white/[0.02] border border-white dark:border-white/10 backdrop-blur-3xl shadow-[0_30px_70px_rgba(255,218,185,0.25)] dark:shadow-none mb-12"
                >
                    {/* Main Timers */}
                    <div className="flex flex-col items-center">
                        <div className="flex justify-between w-full max-w-[320px] mb-12">
                            {/* LEFT DISC */}
                            <div className="flex flex-col items-center gap-5">
                                <button
                                    onClick={() => toggleTimer('left')}
                                    className={cn(
                                        "relative size-36 rounded-full transition-all duration-500 flex flex-col items-center justify-center overflow-hidden border-2",
                                        activeTimer === 'left' 
                                            ? "bg-white dark:bg-[#FFDAB9]/20 border-[#FFDAB9] shadow-[0_20px_45px_rgba(255,218,185,0.5)] scale-110" 
                                            : "bg-white/60 dark:bg-white/5 border-white dark:border-white/10 dark:shadow-none shadow-xl shadow-slate-200/50"
                                    )}
                                >
                                    {activeTimer === 'left' && (
                                        <motion.div 
                                            initial={{ y: "100%" }}
                                            animate={{ y: "0%" }}
                                            className="absolute inset-0 bg-[#FFDAB9]/20 z-0 pointer-events-none"
                                            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
                                        />
                                    )}
                                    <div className="relative z-10 flex flex-col items-center">
                                        <span className={cn(
                                            "material-symbols-rounded text-4xl mb-1",
                                            activeTimer === 'left' ? "text-orange-500 animate-pulse" : "text-slate-300"
                                        )}>
                                            {activeTimer === 'left' ? 'pause_circle' : 'play_circle'}
                                        </span>
                                        {isManual ? (
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                onChange={(e) => handleManualChange('left', e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-16 bg-slate-100 dark:bg-black/40 text-center font-black text-slate-800 dark:text-white rounded-xl p-2 text-sm outline-none"
                                            />
                                        ) : (
                                            <span className={cn("text-xl font-black tabular-nums", activeTimer === 'left' ? "text-orange-600 dark:text-white" : "text-slate-400 whitespace-nowrap")}>
                                                {formatTime(leftTime)}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Izquierdo</span>
                            </div>

                            {/* RIGHT DISC */}
                            <div className="flex flex-col items-center gap-5">
                                <button
                                    onClick={() => toggleTimer('right')}
                                    className={cn(
                                        "relative size-36 rounded-full transition-all duration-500 flex flex-col items-center justify-center overflow-hidden border-2",
                                        activeTimer === 'right' 
                                            ? "bg-white dark:bg-[#A7F3D0]/20 border-[#A7F3D0] shadow-[0_20px_45px_rgba(167,243,208,0.5)] scale-110" 
                                            : "bg-white/60 dark:bg-white/5 border-white dark:border-white/10 dark:shadow-none shadow-xl shadow-slate-200/50"
                                    )}
                                >
                                    {activeTimer === 'right' && (
                                        <motion.div 
                                            initial={{ y: "100%" }}
                                            animate={{ y: "0%" }}
                                            className="absolute inset-0 bg-[#A7F3D0]/20 z-0 pointer-events-none"
                                            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
                                        />
                                    )}
                                    <div className="relative z-10 flex flex-col items-center">
                                        <span className={cn(
                                            "material-symbols-rounded text-4xl mb-1",
                                            activeTimer === 'right' ? "text-emerald-500 animate-pulse" : "text-slate-300"
                                        )}>
                                            {activeTimer === 'right' ? 'pause_circle' : 'play_circle'}
                                        </span>
                                        {isManual ? (
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                onChange={(e) => handleManualChange('right', e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-16 bg-slate-100 dark:bg-black/40 text-center font-black text-slate-800 dark:text-white rounded-xl p-2 text-sm outline-none"
                                            />
                                        ) : (
                                            <span className={cn("text-xl font-black tabular-nums", activeTimer === 'right' ? "text-emerald-600 dark:text-white" : "text-slate-400 whitespace-nowrap")}>
                                                {formatTime(rightTime)}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Derecho</span>
                            </div>
                        </div>

                        {/* Total Counter */}
                        <motion.div 
                            animate={{ scale: totalTime > 0 ? [1, 1.05, 1] : 1 }}
                            className="bg-white/80 dark:bg-white/5 backdrop-blur-2xl px-12 py-5 rounded-[2.5rem] border border-white dark:border-white/10 mb-10 flex items-center gap-5 shadow-2xl shadow-[#FFDAB9]/20 dark:shadow-none"
                        >
                            <span className="text-slate-400 font-black text-[11px] uppercase tracking-[0.2em]">Total</span>
                            <span className="text-3xl font-black text-[#D2691E] dark:text-[#FFDAB9] tabular-nums">{formatTime(totalTime)}</span>
                            <div className="size-2.5 bg-[#FFDAB9] rounded-full animate-ping" />
                        </motion.div>

                        {/* Premium Switch */}
                        <div 
                            onClick={() => {
                                setIsManual(!isManual);
                                if (!isManual) setActiveTimer(null);
                            }}
                            className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer shadow-inner"
                        >
                            <div className={cn(
                                "px-6 py-3 rounded-xl transition-all font-black text-[11px] uppercase tracking-widest",
                                !isManual ? "bg-slate-900 dark:bg-white/10 text-white dark:text-white shadow-lg" : "text-slate-400 dark:text-white/30"
                            )}>Cronómetro</div>
                            <div className={cn(
                                "px-6 py-3 rounded-xl transition-all font-black text-[11px] uppercase tracking-widest",
                                isManual ? "bg-slate-900 dark:bg-white/10 text-white dark:text-white shadow-lg" : "text-slate-400 dark:text-white/30"
                            )}>Manual</div>
                        </div>
                    </div>
                </motion.div>

                {/* Integrated Action Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-8 pb-10 rounded-[3.5rem] bg-white/40 dark:bg-white/[0.02] border border-white dark:border-white/10 backdrop-blur-3xl shadow-[0_30px_70px_rgba(255,218,185,0.2)] dark:shadow-none mb-10"
                >
                    <div className="flex items-center gap-2 mb-6 px-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-700 dark:text-white/30">Observaciones Recibe</span>
                    </div>
                    
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-[2.5rem] p-7 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFDAB9]/50 transition-all font-medium text-sm shadow-inner min-h-[140px] resize-none mb-10"
                        placeholder="Color, apetito, succión..."
                    />

                    <button
                        onClick={handleSave}
                        disabled={loading || totalTime === 0}
                        className={cn(
                            "group relative w-full h-24 rounded-[2.5rem] font-black uppercase tracking-widest text-xs transition-all duration-700 shadow-2xl overflow-hidden active:scale-95",
                            totalTime > 0 
                                ? "bg-slate-900 dark:bg-gradient-to-r dark:from-[#FFDAB9] dark:to-[#FFC0CB] text-white dark:text-slate-900 shadow-[#FFDAB9]/40" 
                                : "bg-white/40 text-slate-400 border border-slate-200 dark:bg-white/5 dark:border-white/10 shadow-none disabled:opacity-50"
                        )}
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <motion.div 
                            animate={totalTime > 0 ? { x: [0, 8, 0] } : {}}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="relative z-10 flex items-center justify-center gap-4"
                        >
                            <span className="material-symbols-rounded text-3xl animate-pulse">favorite</span>
                            <span className="text-base tracking-[0.1em]">
                                {loading ? 'Sincronizando...' : 'Finalizar Lactancia'}
                            </span>
                        </motion.div>
                        
                        {/* Vital Wave Effect */}
                        {totalTime > 0 && (
                            <motion.div 
                                initial={{ x: '-100%' }}
                                animate={{ x: '100%' }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                            />
                        )}
                    </button>
                    
                    {/* Visual Hint for Depth */}
                    <div className="mt-4 flex justify-center opacity-20">
                        <div className="w-12 h-1 bg-slate-400 rounded-full" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
