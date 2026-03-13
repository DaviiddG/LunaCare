import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { useBabies } from '../hooks/useBabies';
import { dbHelpers } from '../lib/db';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

type EventType = 'sleep' | 'diet' | 'bottle' | 'diaper' | 'solids';

interface TimelineEvent {
    id: string;
    type: EventType;
    title: string;
    subtitle: string;
    time: Date;
    dotColor: string;
    iconColor: string;
    icon: string;
    note?: string;
    noteColor?: string;
    noteBg?: string;
    auraColor?: string;
}

const TYPE_CONFIG: Record<EventType, { title: string; icon: string; dotColor: string; iconColor: string; noteColor: string; noteBg: string; auraColor: string }> = {
    sleep: {
        title: 'Sueño',
        icon: 'bedtime',
        dotColor: '#A5B4FC',
        iconColor: 'text-indigo-500',
        noteColor: 'text-indigo-600 dark:text-indigo-400',
        noteBg: 'bg-indigo-50 dark:bg-indigo-900/20',
        auraColor: 'shadow-indigo-500/20'
    },
    diet: {
        title: 'Lactancia',
        icon: 'favorite',
        dotColor: '#FDBA74',
        iconColor: 'text-orange-400',
        noteColor: 'text-orange-600 dark:text-orange-400',
        noteBg: 'bg-orange-50 dark:bg-orange-900/20',
        auraColor: 'shadow-orange-500/20'
    },
    bottle: {
        title: 'Biberón',
        icon: 'water_drop',
        dotColor: '#93C5FD',
        iconColor: 'text-blue-400',
        noteColor: 'text-blue-600 dark:text-blue-400',
        noteBg: 'bg-blue-50 dark:bg-blue-900/20',
        auraColor: 'shadow-blue-500/20'
    },
    diaper: {
        title: 'Pañal',
        icon: 'soap',
        dotColor: '#FDE047',
        iconColor: 'text-yellow-500',
        noteColor: 'text-yellow-700 dark:text-yellow-500',
        noteBg: 'bg-yellow-50 dark:bg-yellow-900/20',
        auraColor: 'shadow-yellow-500/20'
    },
    solids: {
        title: 'Sólidos',
        icon: 'potted_plant',
        dotColor: '#86EFAC',
        iconColor: 'text-green-500',
        noteColor: 'text-green-700 dark:text-green-500',
        noteBg: 'bg-green-50 dark:bg-green-900/20',
        auraColor: 'shadow-green-500/20'
    },
};

const MeshBackground = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-10">
        <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-purple-400/20 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-400/20 blur-[160px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
);

export function HistoryPage() {
    const { user } = useAuth();
    const { selectedBaby } = useBabies();
    const navigate = useNavigate();
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [summary, setSummary] = useState('Analizando actividad...');
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');

    useEffect(() => {
        const handleSync = () => setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        window.addEventListener('luna-settings-updated', handleSync);
        return () => window.removeEventListener('luna-settings-updated', handleSync);
    }, []);

    const fetchHistory = useCallback(async () => {
        if (!selectedBaby) return;
        setIsLoading(true);

        try {
            const [sleepRes, dietRes, diaperRes, solidsRes] = await Promise.all([
                dbHelpers.getSleepLogs(selectedBaby.id),
                dbHelpers.getDiets(selectedBaby.id),
                dbHelpers.getDiapers(selectedBaby.id),
                dbHelpers.getSolids(selectedBaby.id),
            ]);

            const allEvents: TimelineEvent[] = [];

            const newest = (data: any[] | null, dateField = 'created_at') =>
                [...(data || [])].sort(
                    (a, b) => new Date(b[dateField] || b.created_at).getTime() - new Date(a[dateField] || a.created_at).getTime()
                );

            const fmtMins = (mins: number) => {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return h > 0 ? `${h}h ${m}m` : `${m}m`;
            };

            // Sleep logs
            newest(sleepRes.data, 'start_time').slice(0, 20).forEach((log: any) => {
                const cfg = TYPE_CONFIG.sleep;
                let duration = '';
                if (log.duration !== undefined && log.duration !== null) {
                    const mins = typeof log.duration === 'number' ? log.duration : parseFloat(log.duration);
                    duration = isNaN(mins) ? String(log.duration) : fmtMins(mins);
                } else if (log.start_time && log.end_time) {
                    const diffMs = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
                    const hrs = Math.floor(diffMs / 3600000);
                    const m = Math.floor((diffMs % 3600000) / 60000);
                    duration = hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
                }
                allEvents.push({
                    id: `sleep-${log.id}`,
                    type: 'sleep',
                    title: cfg.title,
                    subtitle: [duration, log.type === 'siesta' ? 'Siesta' : log.type === 'nocturno' ? 'Sueño nocturno' : null].filter(Boolean).join(' • '),
                    time: new Date(log.start_time || log.created_at),
                    dotColor: cfg.dotColor,
                    iconColor: cfg.iconColor,
                    icon: cfg.icon,
                    note: log.notes || undefined,
                    noteColor: cfg.noteColor,
                    noteBg: cfg.noteBg,
                    auraColor: cfg.auraColor
                });
            });

            // Diet
            newest(dietRes.data).slice(0, 20).forEach((log: any) => {
                const isBottle = log.type?.startsWith('bottle_');
                const cfg = isBottle ? TYPE_CONFIG.bottle : TYPE_CONFIG.diet;
                const detail = [
                    log.amount ? `${log.amount} ml` : (log.duration ? `${log.duration} min` : null),
                    log.side ? (log.side === 'left' ? 'Izquierdo' : log.side === 'right' ? 'Derecho' : 'Ambos') : null,
                ].filter(Boolean).join(' • ');

                allEvents.push({
                    id: `diet-${log.id}`,
                    type: isBottle ? 'bottle' : 'diet',
                    title: isBottle ? (log.type === 'bottle_formula' ? 'Biberón (Fórmula)' : 'Biberón (Materna)') : cfg.title,
                    subtitle: detail || (isBottle ? 'Biberón registrado' : 'Toma registrada'),
                    time: new Date(log.created_at),
                    dotColor: cfg.dotColor,
                    iconColor: cfg.iconColor,
                    icon: cfg.icon,
                    note: log.notes || undefined,
                    noteColor: cfg.noteColor,
                    noteBg: cfg.noteBg,
                    auraColor: cfg.auraColor
                });
            });

            // Diapers
            newest(diaperRes.data).slice(0, 20).forEach((log: any) => {
                const cfg = TYPE_CONFIG.diaper;
                allEvents.push({
                    id: `diaper-${log.id}`,
                    type: 'diaper',
                    title: cfg.title,
                    subtitle: log.status || 'Cambio registrado',
                    time: new Date(log.created_at),
                    dotColor: cfg.dotColor,
                    iconColor: cfg.iconColor,
                    icon: cfg.icon,
                    note: log.observations || undefined,
                    noteColor: cfg.noteColor,
                    noteBg: cfg.noteBg,
                    auraColor: cfg.auraColor
                });
            });

            // Solids
            newest(solidsRes.data).slice(0, 20).forEach((log: any) => {
                const cfg = TYPE_CONFIG.solids;
                const foods = Array.isArray(log.foods) ? log.foods.join(', ') : log.foods || '';
                allEvents.push({
                    id: `solids-${log.id}`,
                    type: 'solids',
                    title: cfg.title,
                    subtitle: foods || 'Sólidos registrados',
                    time: new Date(log.created_at),
                    dotColor: cfg.dotColor,
                    iconColor: cfg.iconColor,
                    icon: cfg.icon,
                    note: log.observations || undefined,
                    noteColor: cfg.noteColor,
                    noteBg: cfg.noteBg,
                    auraColor: cfg.auraColor
                });
            });

            allEvents.sort((a, b) => b.time.getTime() - a.time.getTime());
            setEvents(allEvents.slice(0, 60));

            // Summary logic
            const today = new Date();
            const todayEvents = allEvents.filter(e => e.time.toDateString() === today.toDateString());
            const sleepCount = todayEvents.filter(e => e.type === 'sleep').length;
            const feedCount = todayEvents.filter(e => e.type === 'diet' || e.type === 'bottle').length;
            const diaperCount = todayEvents.filter(e => e.type === 'diaper').length;

            if (todayEvents.length === 0) {
                setSummary(`Aún no hay actividad registrada hoy.`);
            } else {
                setSummary(`Hoy llevamos ${feedCount} tomas, ${sleepCount} siestas y ${diaperCount} cambios.`);
            }

        } catch (e) {
            setSummary('No se pudo cargar el historial.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedBaby]);

    useEffect(() => {
        if (selectedBaby && user) {
            fetchHistory();
        }
    }, [selectedBaby, user, fetchHistory]);

    const groupedEvents = events.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
        const key = format(event.time, 'EEEE, d MMMM', { locale: es });
        if (!acc[key]) acc[key] = [];
        acc[key].push(event);
        return acc;
    }, {});

    return (
        <div className="relative min-h-screen bg-[#F8FAFC] dark:bg-[#050811] pb-32 font-['Manrope',sans-serif] text-slate-900 dark:text-white selection:bg-blue-200/30 overflow-x-hidden">
            <MeshBackground />

            {/* Premium Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl border-b border-white/40 dark:border-white/5 py-4 px-6 md:px-10">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex size-11 items-center justify-center rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl hover:bg-white/60 dark:hover:bg-white/10 active:scale-95 transition-all shadow-sm"
                    >
                        <span className="material-symbols-rounded text-slate-700 dark:text-white/70">arrow_back_ios_new</span>
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1">Momentos</span>
                        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase transition-all duration-500">Historial</h2>
                    </div>
                    <div className="size-11" />
                </div>
            </div>

            <main className="relative z-10 max-w-2xl mx-auto px-5 pt-32">
                {/* Crystal Summary Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative mb-12 group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-[2.5rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <div className="relative p-7 rounded-[2.5rem] bg-white/60 dark:bg-white/[0.03] border border-white dark:border-white/10 backdrop-blur-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                        <div className="flex items-center gap-5">
                            <div className="relative size-16 shrink-0 rounded-[1.2rem] border-2 border-white dark:border-white/10 overflow-hidden shadow-xl">
                                <img src={lunaIcon} alt="Luna" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Resumen del Día</span>
                                <p className="text-base font-bold text-slate-800 dark:text-white/90 leading-tight">{summary}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="size-14 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">Sincronizando timeline...</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(groupedEvents).map(([dateLabel, dayEvents], groupIdx) => (
                            <div key={dateLabel} className="relative">
                                {/* Date Ribbon */}
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: groupIdx * 0.1 }}
                                    className="sticky top-24 z-20 flex items-center justify-center mb-8"
                                >
                                    <div className="px-6 py-2 rounded-full bg-slate-900/90 dark:bg-white/10 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white whitespace-nowrap capitalize">
                                            {dateLabel}
                                        </span>
                                    </div>
                                </motion.div>

                                <div className="space-y-6 relative ml-4 md:ml-10">
                                    {/* Glowing Timeline Line */}
                                    <div className="absolute left-[23px] top-4 bottom-4 w-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ height: 0 }}
                                            animate={{ height: '100%' }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className="w-full bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400 opacity-50 shadow-[0_0_15px_rgba(96,165,250,0.5)]"
                                        />
                                    </div>

                                    {dayEvents.map((event, eventIdx) => (
                                        <motion.div
                                            key={event.id}
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: (groupIdx * 0.1) + (eventIdx * 0.05) }}
                                            className="relative flex items-start gap-8"
                                        >
                                            {/* Connector Node */}
                                            <div className="relative z-10 size-12 shrink-0 rounded-[1.2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 shadow-xl flex items-center justify-center translate-y-2 group transition-all">
                                                <div 
                                                    className={cn("absolute inset-2 rounded-lg opacity-20 blur-sm group-hover:blur-md transition-all", event.dotColor === '#A5B4FC' ? 'bg-indigo-400' : event.dotColor === '#FDBA74' ? 'bg-orange-400' : event.dotColor === '#93C5FD' ? 'bg-blue-400' : event.dotColor === '#FDE047' ? 'bg-yellow-400' : 'bg-green-400')}
                                                />
                                                <span className={cn("material-symbols-rounded text-2xl relative z-10", event.iconColor)}>
                                                    {event.icon}
                                                </span>
                                            </div>

                                            {/* Premium Activity Card */}
                                            <div className="flex-1 group pt-1 pb-1">
                                                <div className={cn(
                                                    "relative p-6 rounded-[2rem] bg-white/40 dark:bg-white/[0.02] border border-white dark:border-white/10 backdrop-blur-xl shadow-lg transition-all duration-500 overflow-hidden group-active:scale-[0.98]",
                                                    "hover:shadow-2xl hover:-translate-y-1 dark:hover:bg-white/[0.04] shadow-slate-200/60 dark:shadow-none"
                                                )}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white/90">
                                                            {event.title}
                                                        </h3>
                                                        <span className="text-[10px] font-black tabular-nums text-slate-400 tracking-wider">
                                                            {format(event.time, 'hh:mm a')}
                                                        </span>
                                                    </div>
                                                    
                                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                                        {event.subtitle}
                                                    </p>

                                                    {event.note && (
                                                        <div className={cn("p-4 rounded-[1.5rem] border border-white/50 dark:border-white/5 shadow-inner", event.noteBg)}>
                                                            <div className="flex gap-3">
                                                                <span className={cn("material-symbols-rounded text-lg mt-0.5", event.noteColor)}>auto_awesome</span>
                                                                <p className={cn("text-xs font-bold leading-relaxed italic", event.noteColor)}>
                                                                    {event.note}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Glow Aura */}
                                                    <div className={cn("absolute -right-10 -bottom-10 size-32 opacity-0 group-hover:opacity-20 blur-3xl transition-opacity rounded-full bg-gradient-to-br", event.iconColor.includes('indigo') ? 'from-indigo-400' : event.iconColor.includes('orange') ? 'from-orange-400' : event.iconColor.includes('blue') ? 'from-blue-400' : event.iconColor.includes('yellow') ? 'from-yellow-400' : 'from-green-400')} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
