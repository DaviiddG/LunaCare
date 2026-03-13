import { useState, useEffect, useRef } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { useCallback } from 'react';
import { useBabies } from '../hooks/useBabies';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

function useTimer(startTime: Date | null) {
    const [elapsed, setElapsed] = useState('00:00:00');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (startTime) {
            const update = () => {
                const diff = Date.now() - startTime.getTime();
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
            };
            update();
            intervalRef.current = setInterval(update, 1000);
        } else {
            setElapsed(prev => prev === '00:00:00' ? prev : '00:00:00');
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [startTime]);

    return elapsed;
}

const NebulaBackground = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3994ef]/10 dark:bg-[#3994ef]/20 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#9d8cf2]/10 dark:bg-[#9d8cf2]/15 blur-[150px] rounded-full animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-[#4f46e5]/5 dark:bg-[#4f46e5]/10 blur-[100px] rounded-full" />
    </div>
);

export function SleepPage() {
    const { user } = useAuth();
    const { selectedBaby } = useBabies();
    const navigate = useNavigate();

    const [isSleeping, setIsSleeping] = useState(false);
    const [sleepType, setSleepType] = useState<'siesta' | 'nocturno'>('nocturno');
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);
    const [insightText, setInsightText] = useState('Analizando registros de sueño...');
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');

    useEffect(() => {
        const handleSync = () => setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        window.addEventListener('luna-settings-updated', handleSync);
        return () => window.removeEventListener('luna-settings-updated', handleSync);
    }, []);

    const [manualStart, setManualStart] = useState('');
    const [manualEnd, setManualEnd] = useState('');
    const [notes, setNotes] = useState('');
    const [manualLoading, setManualLoading] = useState(false);
    const [manualSaved, setManualSaved] = useState(false);

    const elapsed = useTimer(startTime);

    const fetchInsight = useCallback(async () => {
        if (!selectedBaby) return;
        setInsightText('Analizando registros de sueño...');
        const { data } = await dbHelpers.getSleepLogs(selectedBaby.id);
        if (data && data.length > 0) {
            const today = new Date();
            const todayLogs = data.filter((log: any) => {
                const d = new Date(log.created_at || log.start_time);
                return d.toDateString() === today.toDateString();
            });
            const totalMs = todayLogs.reduce((acc: number, log: any) => {
                if (!log.start_time || !log.end_time) return acc;
                return acc + (new Date(log.end_time).getTime() - new Date(log.start_time).getTime());
            }, 0);
            const totalHours = Math.round(totalMs / 3600000 * 10) / 10;
            const { geminiHelpers } = await import('../lib/gemini');
            const context = `${selectedBaby.name} ha dormido ${totalHours} horas hoy en total.`;
            const prompt = `Con la siguiente info: "${context}", da un consejo MUY CORTO (1-2 frases) y amigable sobre el sueño del bebé. NO uses negritas ni markdown.`;
            const res = await geminiHelpers.sendMessageWithContext(prompt, [], context);
            if (res.text) setInsightText(res.text.replace(/\*/g, ''));
        } else {
            setInsightText('Registra el primer sueño de hoy y Luna te dará consejos personalizados.');
        }
    }, [selectedBaby]);

    useEffect(() => {
        setIsSleeping(false);
        setStartTime(null);
        if (selectedBaby) {
            const savedStart = localStorage.getItem(`sleep_start_${selectedBaby.id}`);
            if (savedStart) {
                setStartTime(new Date(savedStart));
                setIsSleeping(true);
            }
            fetchInsight();
        }
    }, [selectedBaby, fetchInsight]);

    const handleToggleSleep = async () => {
        if (!user || !selectedBaby) return;
        if (!isSleeping) {
            const now = new Date();
            setStartTime(now);
            setIsSleeping(true);
            localStorage.setItem(`sleep_start_${selectedBaby.id}`, now.toISOString());
        } else {
            setLoading(true);
            const endTime = new Date();
            const start = startTime || new Date();
            const diffMs = endTime.getTime() - start.getTime();
            const diffMins = Math.round(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            const durationStr = `${hours}h ${mins}m`;

            const { error } = await dbHelpers.insertSleepLog({
                start_time: start.toISOString(),
                end_time: endTime.toISOString(),
                duration: durationStr,
                user_id: user.id,
                baby_id: selectedBaby.id,
            });

            if (!error) {
                setIsSleeping(false);
                setStartTime(null);
                localStorage.removeItem(`sleep_start_${selectedBaby.id}`);
                fetchInsight();
                window.dispatchEvent(new CustomEvent('luna-action-completed'));
            }
            setLoading(false);
        }
    };

    const handleManualSave = async () => {
        if (!user || !selectedBaby || !manualStart || !manualEnd) return;
        setManualLoading(true);
        const today = format(new Date(), 'yyyy-MM-dd');
        const startISO = `${today}T${manualStart}:00`;
        const endISO = `${today}T${manualEnd}:00`;
        const diffMs = new Date(endISO).getTime() - new Date(startISO).getTime();
        if (diffMs <= 0) { setManualLoading(false); return; }
        const diffMins = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        const durationStr = `${hours}h ${mins}m`;

        const { error } = await dbHelpers.insertSleepLog({
            start_time: startISO,
            end_time: endISO,
            duration: durationStr,
            user_id: user.id,
            baby_id: selectedBaby.id,
        });

        if (!error) {
            setManualSaved(true);
            setManualStart('');
            setManualEnd('');
            setNotes('');
            fetchInsight();
            window.dispatchEvent(new CustomEvent('luna-action-completed'));
            setTimeout(() => setManualSaved(false), 2000);
        }
        setManualLoading(false);
    };

    return (
        <div className="relative bg-[#F8FAFC] dark:bg-[#050811] min-h-screen pb-28 font-['Manrope',sans-serif] text-slate-900 dark:text-white selection:bg-[#3994ef]/30">
            <NebulaBackground />

            {/* Content Container */}
            <div className="relative z-10 max-w-lg mx-auto px-4">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center py-6 justify-between transition-all"
                >
                    <button
                        onClick={() => navigate('/')}
                        className="flex size-11 items-center justify-center rounded-2xl bg-white/20 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all shadow-sm"
                    >
                        <span className="material-symbols-rounded text-slate-600 dark:text-white/70">arrow_back_ios_new</span>
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3994ef] mb-1">Cuidado Infantil</span>
                        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Registro de Sueño</h2>
                    </div>
                    <div className="size-11" /> {/* Spacer */}
                </motion.div>

                {/* Luna Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative mb-8"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3994ef]/30 to-[#9d8cf2]/30 rounded-[2rem] blur-xl opacity-50" />
                    <div className="relative p-5 rounded-[2rem] bg-white/40 dark:bg-white/[0.03] border border-white dark:border-white/10 backdrop-blur-2xl overflow-hidden group shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-symbols-rounded text-6xl">auto_awesome</span>
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

                {/* Main Control */}
                <div className="flex flex-col items-center py-8">
                    <div className="relative flex items-center justify-center size-72 mb-10">
                        {/* Orbital Ring 1 */}
                        <div className="absolute inset-0 rounded-full border border-white/[0.05]" />
                        {/* Orbital Ring 2 */}
                        <div className="absolute inset-4 rounded-full border border-white/[0.03]" />
                        
                        {/* Main Circle */}
                        <motion.div 
                            animate={{ 
                                scale: isSleeping ? [1, 1.02, 1] : 1,
                                rotate: isSleeping ? 360 : 0
                            }}
                            transition={{ 
                                scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                                rotate: { duration: 15, repeat: Infinity, ease: "linear" }
                            }}
                            className="absolute inset-8 rounded-full border-2 border-dashed border-[#3994ef]/20"
                        />
                        
                        {/* Timer Glass */}
                        <div className="relative z-10 flex flex-col items-center justify-center size-48 rounded-full bg-white/40 dark:bg-white/[0.02] border border-white dark:border-white/10 backdrop-blur-3xl shadow-[0_15px_45px_rgba(57,148,239,0.1)] dark:shadow-none">
                            <AnimatePresence mode="wait">
                                <motion.span 
                                    key={elapsed}
                                    initial={{ opacity: 0.8, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-5xl font-black tracking-tighter tabular-nums text-slate-900 dark:text-white drop-shadow-glow"
                                >
                                    {elapsed.split(':').slice(0, 2).join(':')}
                                    <span className="text-2xl opacity-40">:{elapsed.split(':')[2]}</span>
                                </motion.span>
                            </AnimatePresence>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3994ef] mt-2">
                                {isSleeping ? 'Tiempo Activo' : 'Sesión Lista'}
                            </span>
                        </div>
                        
                        {/* Rotating Star */}
                        {isSleeping && (
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 p-1"
                            >
                                <div className="size-4 bg-[#3994ef] rounded-full shadow-[0_0_20px_#3994ef] blur-[2px]" />
                            </motion.div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full flex flex-col gap-6">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setSleepType('siesta')}
                                className={cn(
                                    "flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all",
                                    sleepType === 'siesta' 
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-xl shadow-slate-200 dark:shadow-[0_0_25px_rgba(255,255,255,0.2)]" 
                                        : "bg-white/40 dark:bg-white/5 text-slate-400 dark:text-white/40 border border-slate-200 dark:border-white/10 shadow-sm"
                                )}
                            >
                                <span className="material-symbols-rounded text-lg">light_mode</span>
                                Siesta
                            </button>
                            <button
                                onClick={() => setSleepType('nocturno')}
                                className={cn(
                                    "flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all",
                                    sleepType === 'nocturno' 
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-xl shadow-slate-200 dark:shadow-[0_0_25px_rgba(255,255,255,0.2)]" 
                                        : "bg-white/40 dark:bg-white/5 text-slate-400 dark:text-white/40 border border-slate-200 dark:border-white/10 shadow-sm"
                                )}
                            >
                                <span className="material-symbols-rounded text-lg">nightlight</span>
                                Noche
                            </button>
                        </div>

                        <button
                            onClick={handleToggleSleep}
                            disabled={loading || !selectedBaby}
                            className={cn(
                                "group relative h-20 rounded-[2rem] overflow-hidden transition-all duration-500",
                                isSleeping 
                                    ? "bg-white dark:bg-white text-black border border-slate-200 dark:border-transparent active:scale-[0.98] shadow-lg shadow-slate-100 dark:shadow-none" 
                                    : "bg-slate-900 dark:bg-gradient-to-r dark:from-[#3994ef] dark:to-[#9d8cf2] text-white shadow-[0_20px_40px_rgba(57,148,239,0.3)] dark:shadow-[0_20px_40px_rgba(57,148,239,0.3)] active:scale-95"
                            )}
                        >
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 flex items-center justify-center gap-4">
                                <span className="material-symbols-rounded text-3xl animate-bounce-slow">
                                    {isSleeping ? 'notifications_active' : 'bedtime'}
                                </span>
                                <span className="text-lg font-black uppercase tracking-tight">
                                    {loading ? 'Procesando...' : isSleeping ? 'Despertar' : '¡A dormir!'}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Manual Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-10 p-6 rounded-[2.5rem] bg-white/40 dark:bg-white/[0.02] border border-white dark:border-white/10 backdrop-blur-xl mb-10 shadow-xl shadow-slate-200/50 dark:shadow-none"
                >
                    <div className="flex items-center gap-2 mb-6">
                        <div className="size-8 rounded-lg bg-[#3994ef]/10 dark:bg-[#3994ef]/20 flex items-center justify-center">
                            <span className="material-symbols-rounded text-[#3994ef] text-sm">edit_note</span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Aviso Manual</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Inicio</span>
                            <div className="relative">
                                <input
                                    type="time"
                                    value={manualStart}
                                    onChange={e => setManualStart(e.target.value)}
                                    className="w-full h-14 bg-white/60 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 text-lg font-bold text-slate-800 dark:text-white focus:border-[#3994ef]/50 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Fin</span>
                            <div className="relative">
                                <input
                                    type="time"
                                    value={manualEnd}
                                    onChange={e => setManualEnd(e.target.value)}
                                    className="w-full h-14 bg-white/60 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 text-lg font-bold text-slate-800 dark:text-white focus:border-[#3994ef]/50 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mb-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Notas</span>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full bg-white/60 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-[1.5rem] p-5 text-slate-700 dark:text-white/80 text-sm focus:border-[#3994ef]/50 outline-none transition-all resize-none shadow-inner"
                            placeholder="¿Cómo fue el despertar?"
                            rows={3}
                        />
                    </div>

                    <button
                        onClick={handleManualSave}
                        disabled={manualLoading || !manualStart || !manualEnd || !selectedBaby}
                        className="w-full h-16 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-slate-800 dark:hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-20"
                    >
                        {manualSaved ? '✓ ¡Guardado!' : manualLoading ? 'Cargando...' : 'Guardar Sesión'}
                    </button>
                </motion.div>
            </div>

            <style>{`
                .drop-shadow-glow {
                    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}
