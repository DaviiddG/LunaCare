import { useState, useEffect, useCallback, useRef } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { useBabies } from '../hooks/useBabies';
import { useNavigate } from 'react-router-dom';
import { motion, useSpring } from 'motion/react';
import { cn } from '../lib/utils';

const CrystalBackground = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#3994ef]/5 dark:bg-[#3994ef]/10 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-5%] right-[-10%] w-[50%] h-[50%] bg-[#9d8cf2]/5 dark:bg-[#9d8cf2]/10 blur-[100px] rounded-full animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[30%] left-[10%] w-[40%] h-[40%] bg-white dark:bg-white/[0.02] blur-[80px] rounded-full" />
    </div>
);

export function BottlePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedBaby } = useBabies();

    const [amount, setAmount] = useState(120);
    const [contentType, setContentType] = useState<'breastmilk' | 'formula'>('formula');
    const [temperature, setTemperature] = useState<'Frío' | 'Ambiente' | 'Tibio'>('Ambiente');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [insightText, setInsightText] = useState('Analizando registros de biberón...');
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');
    const bottleRef = useRef<HTMLDivElement>(null);
    const rawAmountRef = useRef<number>(120); // tracks unrounded value for smooth dragging

    // Smooth liquid level animation
    const springAmount = useSpring(120, { stiffness: 300, damping: 30 });
    useEffect(() => {
        springAmount.set(amount);
    }, [amount, springAmount]);

    // Keep rawAmountRef in sync when amount is changed by buttons or presets
    useEffect(() => {
        rawAmountRef.current = amount;
    }, [amount]);

    useEffect(() => {
        const handleSync = () => setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        window.addEventListener('luna-settings-updated', handleSync);
        return () => window.removeEventListener('luna-settings-updated', handleSync);
    }, []);

    const fetchInsight = useCallback(async (babyId: string) => {
        setInsightText('Analizando registros de biberón...');
        try {
            const { data } = await dbHelpers.getDiets(babyId);
            if (data) {
                const todayBottles = data.filter((d: any) =>
                    (d.type === 'bottle_formula' || d.type === 'bottle_breastmilk') &&
                    new Date(d.created_at || "").toDateString() === new Date().toDateString()
                );
                const totalMl = todayBottles.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
                const context = `El bebé ha tomado ${totalMl}ml en biberón hoy.`;
                const { geminiHelpers } = await import('../lib/gemini');
                const prompt = `Da un consejo MUY CORTO (1 línea) empático sobre alimentación con biberón. Menciona que ha tomado ${totalMl}ml hoy. NO uses negritas ni markdown.`;
                const res = await geminiHelpers.sendMessageWithContext(prompt, [{ role: 'user' as const, parts: [{ text: prompt }] }], context);
                if (res.text) setInsightText(res.text.replace(/\*/g, ''));
            }
        } catch (e) {
            setInsightText('¡Listos para la toma! ✨');
        }
    }, []);

    useEffect(() => {
        if (selectedBaby) {
            fetchInsight(selectedBaby.id);
            setAmount(120);
            setContentType('formula');
            setTemperature('Ambiente');
            setNotes('');
        }
    }, [selectedBaby, fetchInsight]);

    const handleSave = async () => {
        if (!user || !selectedBaby || amount <= 0) return;
        setLoading(true);
        const typeStr = contentType === 'formula' ? 'bottle_formula' : 'bottle_breastmilk';
        const finalNotes = `Contenido: ${contentType === 'formula' ? 'Fórmula' : 'Leche Materna'}, Temperatura: ${temperature}. ${notes}`.trim();

        const { error } = await dbHelpers.insertDiet({
            type: typeStr,
            amount,
            observations: finalNotes,
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
        <div className="relative bg-[#F8FAFC] dark:bg-[#050811] min-h-screen pb-32 font-['Manrope',sans-serif] text-slate-900 dark:text-white selection:bg-[#3994ef]/30 overflow-x-hidden">
            <CrystalBackground />

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
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3994ef] mb-1">Cuidado Infantil</span>
                        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Registro Biberón</h2>
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
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3994ef]/20 to-[#9d8cf2]/20 rounded-[2rem] blur-xl opacity-50 dark:opacity-20" />
                    <div className="relative p-5 rounded-[2rem] bg-white/40 dark:bg-white/[0.03] border border-white dark:border-white/10 backdrop-blur-2xl overflow-hidden group shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-symbols-rounded text-6xl text-[#3994ef]">water_drop</span>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="size-14 shrink-0 rounded-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden shadow-lg relative">
                                <img src={lunaIcon} alt="Luna AI" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#3994ef]">Asistente Luna</span>
                                <p className="text-sm font-bold leading-relaxed text-slate-700 dark:text-white/80">{insightText}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Bottle UI */}
                <div className="flex flex-col items-center mb-10 py-6">
                    <div className="flex justify-center items-center gap-12 w-full">
                        {/* Interactive Bottle */}
                        <div className="relative group cursor-ns-resize">
                            <div className="absolute -inset-8 bg-[#3994ef]/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            {/* Drag Indicator Tooltip */}
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                whileHover={{ opacity: 1, x: -10 }}
                                className="absolute -left-16 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-1 pointer-events-none"
                            >
                                <span className="material-symbols-rounded text-slate-400 text-sm animate-bounce">expand_less</span>
                                <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400 rotate-90 whitespace-nowrap">Deslizar</span>
                                <span className="material-symbols-rounded text-slate-400 text-sm animate-bounce">expand_more</span>
                            </motion.div>

                            <motion.div 
                                ref={bottleRef}
                                onPan={(_, info) => {
                                    // Accumulate raw float for smoothness; only round for display
                                    const mlPerPx = 300 / 256;
                                    rawAmountRef.current = Math.max(0, Math.min(
                                        rawAmountRef.current - info.delta.y * mlPerPx,
                                        300
                                    ));
                                    setAmount(Math.round(rawAmountRef.current / 5) * 5);
                                }}
                                className="relative w-32 h-64 bg-white/40 dark:bg-white/[0.05] border-[3px] border-white dark:border-white/10 rounded-t-[2.5rem] rounded-b-[3.5rem] overflow-hidden backdrop-blur-md shadow-2xl active:border-[#3994ef]/50 transition-colors touch-none select-none"
                            >
                                {/* Liquid */}
                                <motion.div 
                                    style={{ 
                                        height: `${(amount / 300) * 100}%`,
                                        transition: 'height 0.05s linear'
                                    }}
                                    className={cn(
                                        "absolute bottom-0 left-0 right-0",
                                        contentType === 'formula' 
                                            ? "bg-gradient-to-t from-[#FFF9C4] to-[#FFFDE7] dark:from-[#FBC02D]/40 dark:to-[#FFF9C4]/30" 
                                            : "bg-gradient-to-t from-[#FFE0B2] to-[#FFF3E0] dark:from-[#FFB74D]/40 dark:to-[#FFE0B2]/30"
                                    )}
                                >
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                                    <div className="absolute inset-0 bg-white/5 animate-pulse" />
                                </motion.div>
                                
                                {/* Markings — absolutely positioned proportionally (top = 300ml, bottom = 0ml) */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {[300, 240, 180, 120, 60].map(v => (
                                        <div
                                            key={v}
                                            className="absolute left-0 right-0 flex items-center gap-2 px-3 opacity-25"
                                            style={{ top: `${((300 - v) / 300) * 100}%`, transform: 'translateY(-50%)' }}
                                        >
                                            <div className="h-px w-4 bg-slate-900 dark:bg-white flex-shrink-0" />
                                            <span className="text-[7px] font-black text-slate-900 dark:text-white uppercase">{v}ml</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col items-center gap-6">
                            <button 
                                onClick={() => setAmount(prev => Math.min(prev + 30, 300))}
                                className="size-14 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-lg transition-all active:scale-95 group"
                            >
                                <span className="material-symbols-rounded text-2xl text-slate-600 dark:text-white group-hover:text-[#3994ef]">add</span>
                            </button>
                            
                            <div className="flex flex-col items-center">
                                <motion.span 
                                    key={amount}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums"
                                >
                                    {amount}
                                </motion.span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3994ef]">Mililitros</span>
                            </div>

                            <button 
                                onClick={() => setAmount(prev => Math.max(prev - 30, 0))}
                                className="size-14 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-lg transition-all active:scale-95 group"
                            >
                                <span className="material-symbols-rounded text-2xl text-slate-600 dark:text-white group-hover:text-red-400">remove</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-12 w-full max-w-xs">
                        {[60, 120, 180, 240].map(val => (
                            <button
                                key={val}
                                onClick={() => setAmount(val)}
                                className={cn(
                                    "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    amount === val 
                                        ? "bg-slate-900 dark:bg-[#3994ef] text-white shadow-xl shadow-slate-200 dark:shadow-none" 
                                        : "bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/40"
                                )}
                            >
                                {val}ml
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Toggle */}
                <div className="mb-8">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1 mb-3 block">Contenido</span>
                    <div className="flex p-1 bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[1.5rem] backdrop-blur-xl">
                        <button
                            onClick={() => setContentType('breastmilk')}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                contentType === 'breastmilk' ? "bg-slate-900 dark:bg-white/10 text-white shadow-sm" : "text-slate-400"
                            )}
                        >
                            Leche Materna
                        </button>
                        <button
                            onClick={() => setContentType('formula')}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                contentType === 'formula' ? "bg-slate-900 dark:bg-white/10 text-white shadow-sm" : "text-slate-400"
                            )}
                        >
                            Fórmula
                        </button>
                    </div>
                </div>

                {/* Temperature Grid */}
                <div className="mb-8 p-6 rounded-[2.5rem] bg-white/40 dark:bg-white/[0.02] border border-white dark:border-white/10 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1 mb-4 block">Temperatura</span>
                    <div className="grid grid-cols-3 gap-3">
                        {(['Frío', 'Ambiente', 'Tibio'] as const).map((temp) => (
                            <button
                                key={temp}
                                onClick={() => setTemperature(temp)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 rounded-3xl transition-all duration-300",
                                    temperature === temp 
                                        ? "bg-white dark:bg-white/10 shadow-lg border border-slate-100 dark:border-transparent scale-105" 
                                        : "bg-white/60 dark:bg-white/5 border border-slate-100 dark:border-white/5 opacity-60"
                                )}
                            >
                                <span className={cn(
                                    "material-symbols-rounded text-2xl mb-2",
                                    temp === 'Frío' ? "text-blue-400" : temp === 'Ambiente' ? "text-slate-400 dark:text-[#3994ef]" : "text-orange-400"
                                )}>
                                    {temp === 'Frío' ? 'ac_unit' : temp === 'Ambiente' ? 'thermostat' : 'local_fire_department'}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-800 dark:text-white">{temp}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Integrated Action Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-8 pb-10 rounded-[3.5rem] bg-white/40 dark:bg-white/[0.02] border border-white dark:border-white/10 backdrop-blur-3xl shadow-[0_30px_70px_rgba(57,148,239,0.15)] dark:shadow-none mb-10"
                >
                    <div className="flex items-center gap-2 mb-6 px-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-700 dark:text-white/30">Observaciones Toma</span>
                    </div>
                    
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-[2.5rem] p-7 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3994ef]/50 transition-all font-medium text-sm shadow-inner min-h-[140px] resize-none mb-10"
                        placeholder="Consistancia, apetito, eructos..."
                    />

                    <button
                        onClick={handleSave}
                        disabled={loading || amount <= 0 || !selectedBaby}
                        className={cn(
                            "group relative w-full h-24 rounded-[2.5rem] font-black uppercase tracking-widest text-xs transition-all duration-700 shadow-2xl overflow-hidden active:scale-95",
                            amount > 0 
                                ? "bg-slate-900 dark:bg-gradient-to-r dark:from-[#3994ef] dark:to-[#9d8cf2] text-white dark:text-white shadow-blue-500/20" 
                                : "bg-white/40 text-slate-400 border border-slate-200 dark:bg-white/5 dark:border-white/10 shadow-none disabled:opacity-50"
                        )}
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex items-center justify-center gap-5">
                            <motion.span 
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="material-symbols-rounded text-3xl"
                            >
                                water_drop
                            </motion.span>
                            <span className="text-base tracking-[0.1em]">
                                {loading ? 'Cristalizando...' : 'Confirmar Toma'}
                            </span>
                        </div>
                        
                        {/* Shine Effect */}
                        <motion.div 
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                        />
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
