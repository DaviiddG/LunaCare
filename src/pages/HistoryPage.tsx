import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useBabies } from '../hooks/useBabies';
import { dbHelpers } from '../lib/db';
import { motion } from 'motion/react';

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
}

const TYPE_CONFIG: Record<EventType, { title: string; icon: string; dotColor: string; iconColor: string; noteColor: string; noteBg: string }> = {
    sleep: {
        title: 'Sueño',
        icon: 'bedtime',
        dotColor: '#E0D7FF',
        iconColor: 'text-primary',
        noteColor: 'text-primary dark:text-primary',
        noteBg: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    diet: {
        title: 'Lactancia',
        icon: 'child_care',
        dotColor: '#FFD3B6',
        iconColor: 'text-orange-400',
        noteColor: 'text-orange-600 dark:text-orange-400',
        noteBg: 'bg-orange-50 dark:bg-orange-900/20',
    },
    bottle: {
        title: 'Biberón',
        icon: 'baby_changing_station',
        dotColor: '#FFB7B2',
        iconColor: 'text-rose-400',
        noteColor: 'text-rose-600 dark:text-rose-400',
        noteBg: 'bg-rose-50 dark:bg-rose-900/20',
    },
    diaper: {
        title: 'Pañal',
        icon: 'soap',
        dotColor: '#FFF9C4',
        iconColor: 'text-yellow-500',
        noteColor: 'text-yellow-700 dark:text-yellow-500',
        noteBg: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    solids: {
        title: 'Sólidos',
        icon: 'restaurant',
        dotColor: '#A8E6CF',
        iconColor: 'text-green-500',
        noteColor: 'text-green-700 dark:text-green-500',
        noteBg: 'bg-green-50 dark:bg-green-900/20',
    },
};

export function HistoryPage() {
    const { user } = useAuth();
    const { selectedBaby } = useBabies();
    const navigate = useNavigate();
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [summary, setSummary] = useState('Cargando actividad de hoy...');
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');

    useEffect(() => {
        const handleSync = () => setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        window.addEventListener('luna-settings-updated', handleSync);
        return () => window.removeEventListener('luna-settings-updated', handleSync);
    }, []);

    useEffect(() => {
        if (selectedBaby && user) {
            fetchHistory();
        }
    }, [selectedBaby, user]);

    const fetchHistory = async () => {
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

            // Helper: sort data newest-first (works for any timestamp field)
            const newest = (data: any[] | null, dateField = 'created_at') =>
                [...(data || [])].sort(
                    (a, b) => new Date(b[dateField] || b.created_at).getTime() - new Date(a[dateField] || a.created_at).getTime()
                );

            // Helper: format minutes → "Xh Ym" or "Ym"
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
                    // duration may be stored as number (minutes) or string
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
                });
            });

            // Diet (lactancia / biberón)
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
                });
            });

            // Diapers
            newest(diaperRes.data).slice(0, 20).forEach((log: any) => {
                const cfg = TYPE_CONFIG.diaper;
                const typeLabel = log.type === 'wet' ? 'Pis' : log.type === 'dirty' ? 'Caca' : log.type === 'both' ? 'Pis y caca' : log.type || 'Cambio';
                allEvents.push({
                    id: `diaper-${log.id}`,
                    type: 'diaper',
                    title: cfg.title,
                    subtitle: `${typeLabel}${log.notes ? ` • ${log.notes}` : ''}`,
                    time: new Date(log.created_at),
                    dotColor: cfg.dotColor,
                    iconColor: cfg.iconColor,
                    icon: cfg.icon,
                    noteColor: cfg.noteColor,
                    noteBg: cfg.noteBg,
                });
            });

            // Solids
            newest(solidsRes.data).slice(0, 20).forEach((log: any) => {
                const cfg = TYPE_CONFIG.solids;
                const foods = Array.isArray(log.foods) ? log.foods.join(', ') : log.foods || '';
                const detail = [foods, log.amount ? `${log.amount} cucharadas` : null].filter(Boolean).join(' • ');
                allEvents.push({
                    id: `solids-${log.id}`,
                    type: 'solids',
                    title: cfg.title,
                    subtitle: detail || 'Sólidos registrados',
                    time: new Date(log.created_at),
                    dotColor: cfg.dotColor,
                    iconColor: cfg.iconColor,
                    icon: cfg.icon,
                    note: log.notes || undefined,
                    noteColor: cfg.noteColor,
                    noteBg: cfg.noteBg,
                });
            });

            // Global sort newest first, keep top 60
            allEvents.sort((a, b) => b.time.getTime() - a.time.getTime());
            setEvents(allEvents.slice(0, 60));


            // Build AI summary
            const today = new Date();
            const todayEvents = allEvents.filter(e => e.time.toDateString() === today.toDateString());
            const sleepCount = todayEvents.filter(e => e.type === 'sleep').length;
            const feedCount = todayEvents.filter(e => e.type === 'diet' || e.type === 'bottle').length;
            const solidCount = todayEvents.filter(e => e.type === 'solids').length;
            const diaperCount = todayEvents.filter(e => e.type === 'diaper').length;

            if (todayEvents.length === 0) {
                setSummary(`Aún no hay registros de hoy para ${selectedBaby.name}. ¡Empieza a registrar sus actividades!`);
            } else {
                const parts = [];
                if (feedCount > 0) parts.push(`**${feedCount} toma${feedCount !== 1 ? 's' : ''}**`);
                if (sleepCount > 0) parts.push(`**${sleepCount} siesta${sleepCount !== 1 ? 's' : ''}**`);
                if (solidCount > 0) parts.push(`**${solidCount} comida${solidCount !== 1 ? 's' : ''} sólidas**`);
                if (diaperCount > 0) parts.push(`**${diaperCount} pañal${diaperCount !== 1 ? 'es' : ''}**`);
                setSummary(`Hoy ${selectedBaby.name} tuvo ${parts.join(', ')}.`);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            setSummary('No se pudo cargar el historial.');
        } finally {
            setIsLoading(false);
        }
    };

    const groupedEvents = events.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
        const key = format(event.time, 'EEEE, d MMMM', { locale: es });
        if (!acc[key]) acc[key] = [];
        acc[key].push(event);
        return acc;
    }, {});

    // Convert summary markdown bold to JSX
    const renderSummary = (text: string) => {
        const parts = text.split(/\*\*(.*?)\*\*/g);
        return parts.map((part, i) =>
            i % 2 === 1
                ? <span key={i} className="font-bold text-primary">{part}</span>
                : <span key={i}>{part}</span>
        );
    };

    return (
        <div className="min-h-screen bg-[#FDFCFE] dark:bg-[#121212] pb-32">
            {/* Header */}
            <div className="fixed top-0 w-full z-50 bg-[#FDFCFE]/80 dark:bg-[#121212]/80 backdrop-blur-xl px-6 pt-12 pb-4">
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">chevron_left</span>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800 dark:text-white">
                        {selectedBaby ? `Historial de ${selectedBaby.name}` : 'Historial'}
                    </h1>
                    <div className="w-10 h-10" />
                </div>
            </div>

            <main className="pt-32 px-5">
                {/* Luna AI Summary */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950 p-5 mb-6 border border-white dark:border-white/10 shadow-sm">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 overflow-hidden shadow-sm">
                            <img src={lunaIcon} alt="Luna AI" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">Resumen de hoy</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                        {isLoading ? 'Cargando actividad de hoy...' : renderSummary(summary)}
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <span className="material-symbols-rounded text-4xl mb-3 animate-spin">progress_activity</span>
                        <p className="text-sm">Cargando historial...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <span className="material-symbols-rounded text-5xl mb-3">history</span>
                        <p className="text-sm font-medium">Aún no hay actividades registradas</p>
                        <p className="text-xs mt-1">Los registros aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-0">
                        {Object.entries(groupedEvents).map(([dateLabel, dayEvents], groupIdx) => (
                            <motion.div
                                key={dateLabel}
                                className="mb-6"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: groupIdx * 0.08 }}
                            >
                                {/* Date separator */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 capitalize">
                                        {dateLabel}
                                    </span>
                                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                                </div>

                                {/* Timeline */}
                                <div className="relative">
                                    {/* Vertical line */}
                                    <div
                                        className="absolute dark:opacity-20"
                                        style={{
                                            left: '27px',
                                            top: 0,
                                            bottom: 0,
                                            width: '2px',
                                            background: 'linear-gradient(to bottom, transparent, #E2E8F0 10%, #E2E8F0 90%, transparent)',
                                        }}
                                    />
                                    {dayEvents.map((event, eventIdx) => (
                                        <motion.div
                                            key={event.id}
                                            className="relative flex items-start space-x-4 mb-5"
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: groupIdx * 0.08 + eventIdx * 0.05 }}
                                        >
                                            {/* Dot */}
                                            <div className="relative z-10 w-14 flex-shrink-0 flex justify-center">
                                                <div
                                                    className="w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 mt-6 shadow-sm"
                                                    style={{ backgroundColor: event.dotColor }}
                                                />
                                            </div>

                                            {/* Card */}
                                            <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 active:scale-[0.98] transition-transform">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`material-symbols-rounded ${event.iconColor}`}>
                                                            {event.icon}
                                                        </span>
                                                        <h3 className="font-bold text-slate-800 dark:text-white">
                                                            {event.title}
                                                        </h3>
                                                    </div>
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        {format(event.time, 'hh:mm a')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                                    {event.subtitle}
                                                </p>
                                                {event.note && (
                                                    <div className={`mt-3 flex items-start space-x-2 ${event.noteBg} p-2 rounded-xl`}>
                                                        <span className={`material-symbols-rounded text-[16px] ${event.noteColor} mt-0.5`}>
                                                            auto_awesome
                                                        </span>
                                                        <p className={`text-[11px] ${event.noteColor} italic`}>
                                                            {event.note}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
