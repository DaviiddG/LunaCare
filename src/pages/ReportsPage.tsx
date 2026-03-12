import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBabies } from '../hooks/useBabies';
import { useCallback } from 'react';
import { dbHelpers } from '../lib/db';
import { AnimatedList } from '../components/ui/animated-list';
import { NotificationSidebar } from '../components/NotificationSidebar';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export function ReportsPage() {
    const { user } = useAuth();
    const { selectedBaby } = useBabies();
    const [period, setPeriod] = useState<'Semana' | 'Mes'>('Semana');
    const [isLoading, setIsLoading] = useState(true);

    const [sleepData, setSleepData] = useState<{ day: Date, hours: number }[]>([]);
    const [feedingData, setFeedingData] = useState({ breastmilk: 0, formula: 0, solid: 0, total: 0 });
    const [diaperData, setDiaperData] = useState<{ day: Date, count: number }[]>([]);
    const [insightText, setInsightText] = useState('Analizando datos de esta semana...');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');

    useEffect(() => {
        const handleSettingsUpdate = () => {
            setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        };

        window.addEventListener('luna-settings-updated', handleSettingsUpdate);
        return () => window.removeEventListener('luna-settings-updated', handleSettingsUpdate);
    }, []);

    const generateInsight = useCallback(async (sleepLog: any[]) => {
        const { geminiHelpers } = await import('../lib/gemini');
        const totalHours = sleepLog.reduce((acc, curr) => acc + curr.hours, 0);
        const avg = totalHours / (sleepLog.filter(s => s.hours > 0).length || 1);

        const context = `El bebé durmió un promedio de ${avg.toFixed(1)} horas diarias esta semana.`;
        const prompt = `Escribe un comentario súper corto y amigable (máximo 1 línea) resumiendo cómo durmió según este promedio: ${avg.toFixed(1)}h. NO USES NEGRITAS, ASTERISCOS NI MARKDOWN.`;
        const res = await geminiHelpers.sendMessageWithContext(prompt, [], context);
        if (res.text) setInsightText(res.text.replace(/\*/g, ''));
    }, []);

    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        if (!selectedBaby) return;
        const babyId = selectedBaby.id;

        const now = new Date();
        const start = period === 'Semana' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);
        const end = period === 'Semana' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);
        const intervalDays = eachDayOfInterval({ start, end });

        try {
            // 1. Sleep Data
            const { data: sleepLogs } = await dbHelpers.getSleepLogs(babyId);
            const sleepPerDay = intervalDays.map(day => {
                const logsForDay = (sleepLogs || []).filter((log: any) => isSameDay(new Date(log.created_at || log.start_time), day));
                const hours = logsForDay.reduce((acc: number, log: any) => {
                    if (!log.start_time || !log.end_time) return acc;
                    const diffMs = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
                    return acc + (diffMs / (1000 * 60 * 60));
                }, 0);
                return { day, hours };
            });
            setSleepData(sleepPerDay);

            // 2. Feeding Data
            const { data: dietLogs } = await dbHelpers.getDiets(babyId);
            const { data: solidLogs } = await dbHelpers.getSolids(babyId);

            const filteredDiet = (dietLogs || []).filter((log: any) => {
                const date = new Date(log.created_at);
                return date >= start && date <= end;
            });
            const filteredSolids = (solidLogs || []).filter((log: any) => {
                const date = new Date(log.created_at);
                return date >= start && date <= end;
            });

            const stats = { breastmilk: 0, formula: 0, solid: 0, total: 0 };
            filteredDiet.forEach((log: any) => {
                if (log.type === 'breast' || log.type === 'bottle_breastmilk') {
                    stats.breastmilk += (log.amount || 1);
                } else if (log.type === 'bottle_formula') {
                    stats.formula += (log.amount || 1);
                }
            });
            filteredSolids.forEach((log: any) => {
                const amt = parseInt(log.amount) || 1;
                stats.solid += amt;
            });

            stats.total = stats.breastmilk + stats.formula + stats.solid;
            setFeedingData(stats);

            // 3. Diapers Data
            const { data: diaperLogs } = await dbHelpers.getDiapers(babyId);
            const diapersPerDay = intervalDays.map(day => {
                const count = (diaperLogs || []).filter((log: any) => isSameDay(new Date(log.created_at), day)).length;
                return { day, count };
            });
            setDiaperData(diapersPerDay);

            // AI Insight
            if (sleepPerDay.length > 0) {
                generateInsight(sleepPerDay);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [selectedBaby, period, generateInsight]);

    useEffect(() => {
        if (selectedBaby && user) {
            fetchStats();
        }
    }, [selectedBaby, user, fetchStats]);

    return (
        <div className="bg-[#fbfaff] dark:bg-[#191022] text-slate-900 dark:text-slate-100 min-h-screen pb-24 font-['Plus_Jakarta_Sans',sans-serif]">
            <header className="fixed top-0 w-full z-50 bg-[#fbfaff]/80 dark:bg-[#191022]/80 backdrop-blur-md px-6 pt-12 pb-4">
                <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reportes</h1>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setIsNotificationOpen(true)}
                                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 relative"
                            >
                                <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">notifications</span>
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                        <button
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${period === 'Semana' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#8c2bee]' : 'font-medium text-slate-500 dark:text-slate-400'}`}
                            onClick={() => setPeriod('Semana')}
                        >
                            Semana
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${period === 'Mes' ? 'bg-white dark:bg-slate-700 shadow-sm text-[#8c2bee]' : 'font-medium text-slate-500 dark:text-slate-400'}`}
                            onClick={() => setPeriod('Mes')}
                        >
                            Mes
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-44 px-5 space-y-4">
                <AnimatedList delay={250}>
                    <div className="bg-gradient-to-br from-indigo-500 to-[#8c2bee] p-5 rounded-xl text-white shadow-lg relative overflow-hidden w-full">
                        <div className="relative z-10 flex items-start space-x-4">
                            <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600 overflow-hidden flex-shrink-0 bg-white">
                                <img alt="Luna AI Avatar" className="w-full h-full object-cover" src={lunaIcon} />
                            </div>
                            <div>
                                <div className="flex items-center space-x-1 mb-1">
                                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">Luna AI Summary</span>
                                </div>
                                {isLoading ? (
                                    <div className="h-4 bg-white/20 animate-pulse rounded w-3/4 mt-2"></div>
                                ) : (
                                    <p className="text-sm font-medium leading-relaxed">
                                        {insightText}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 opacity-20">
                            <span className="material-symbols-outlined text-8xl">insights</span>
                        </div>
                    </div>

                    <section className="relative group overflow-hidden glass-morphism bg-noise p-6 rounded-[2rem] w-full">
                        {/* Background glow effects */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-500/10 blur-[50px] pointer-events-none"></div>
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 blur-[40px] pointer-events-none"></div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white uppercase">Calidad del Sueño</h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{period === 'Semana' ? 'Vista Semanal' : 'Vista Mensual'}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-sky-500 dark:text-sky-400 text-2xl font-bold">nights_stay</span>
                            </div>
                        </div>

                        <div className="relative h-48 flex items-end justify-between px-2 mb-6 gap-3 group/chart">
                            {/* Horizontal grid lines for context */}
                            <div className="absolute inset-0 flex flex-col justify-between py-1 opacity-10 pointer-events-none">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="w-full h-[1px] bg-slate-400 dark:bg-white"></div>
                                ))}
                            </div>

                            <AnimatePresence mode="popLayout">
                                {sleepData.map((d, i) => {
                                    const maxPossibleHours = 14; // Baby standard
                                    const heightPercentage = Math.min((d.hours / maxPossibleHours) * 100, 100);
                                    const label = format(d.day, period === 'Semana' ? 'EE' : 'dd', { locale: es }).substring(0, 2);
                                    const isToday = isSameDay(d.day, new Date());
                                    
                                    return (
                                        <div key={d.day.toISOString()} className="flex flex-col items-center flex-1 h-full z-10">
                                            <div className="relative w-full h-full flex items-end justify-center group/bar">
                                                {/* Tooltip on hover */}
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    whileHover={{ opacity: 1, y: -5 }}
                                                    className="absolute -top-10 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black px-2 py-1 rounded-lg pointer-events-none shadow-xl z-30"
                                                >
                                                    {d.hours.toFixed(1)}h
                                                </motion.div>

                                                {/* The Bar with Glow */}
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: `${Math.max(heightPercentage, 8)}%`, opacity: 1 }}
                                                    transition={{ 
                                                        type: "spring",
                                                        damping: 15,
                                                        stiffness: 100,
                                                        delay: i * 0.05 
                                                    }}
                                                    className={`w-full max-w-[12px] rounded-full relative overflow-hidden transition-all duration-300 pointer-events-auto ${
                                                        isToday 
                                                        ? 'bg-gradient-to-t from-sky-600 to-indigo-400 shadow-[0_0_20px_rgba(56,189,248,0.5)] scale-110' 
                                                        : 'bg-slate-200 dark:bg-white/10 hover:bg-sky-400/50'
                                                    }`}
                                                >
                                                    {/* Animated shine effect on bars */}
                                                    <motion.div 
                                                        animate={{ y: [0, 200] }}
                                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                        className="absolute top-[-100%] left-0 w-full h-1/2 bg-gradient-to-b from-transparent via-white/20 to-transparent"
                                                    />
                                                </motion.div>
                                            </div>
                                            <span className={`mt-4 text-[9px] font-black uppercase tracking-tighter transition-colors duration-300 ${isToday ? 'text-sky-500' : 'text-slate-400 dark:text-slate-600'}`}>
                                                {label}
                                            </span>
                                        </div>
                                    )
                                })}
                            </AnimatePresence>
                        </div>

                        <button className="group/btn w-full py-4 relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all active:scale-95">
                            <div className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-500/10 to-sky-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                            <span className="relative z-10 text-xs font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 group-hover/btn:text-sky-500 transition-colors">
                                Analítica Detallada
                            </span>
                        </button>
                    </section>
                    <section className="relative group overflow-hidden glass-morphism bg-noise p-6 rounded-[2rem] w-full">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 blur-[50px] pointer-events-none"></div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white uppercase">Nutrición Luna</h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fuentes de Alimentación</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-orange-500 dark:text-orange-400 text-2xl font-bold">restaurant</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-8 mb-8">
                            <div className="relative w-36 h-36 flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_8px_rgba(0,0,0,0.1)]" viewBox="0 0 36 36">
                                    <circle className="stroke-slate-100 dark:stroke-white/5" cx="18" cy="18" fill="none" r="16" strokeWidth="3.5"></circle>
                                    {feedingData.total > 0 && (
                                        <>
                                            <motion.circle 
                                                initial={{ strokeDasharray: "0, 100" }}
                                                animate={{ strokeDasharray: `${(feedingData.breastmilk / feedingData.total) * 100}, 100` }}
                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                className="stroke-orange-400" cx="18" cy="18" fill="none" r="16" strokeWidth="3.5" strokeLinecap="round"
                                            ></motion.circle>
                                            <motion.circle 
                                                initial={{ strokeDasharray: "0, 100", strokeDashoffset: 0 }}
                                                animate={{ 
                                                    strokeDasharray: `${(feedingData.formula / feedingData.total) * 100}, 100`,
                                                    strokeDashoffset: `-${(feedingData.breastmilk / feedingData.total) * 100}`
                                                }}
                                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                                className="stroke-pink-500" cx="18" cy="18" fill="none" r="16" strokeWidth="3.5" strokeLinecap="round"
                                            ></motion.circle>
                                            <motion.circle 
                                                initial={{ strokeDasharray: "0, 100", strokeDashoffset: 0 }}
                                                animate={{ 
                                                    strokeDasharray: `${(feedingData.solid / feedingData.total) * 100}, 100`,
                                                    strokeDashoffset: `-${((feedingData.breastmilk + feedingData.formula) / feedingData.total) * 100}`
                                                }}
                                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                                                className="stroke-emerald-400" cx="18" cy="18" fill="none" r="16" strokeWidth="3.5" strokeLinecap="round"
                                            ></motion.circle>
                                        </>
                                    )}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <motion.span 
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-[10px] font-black uppercase text-slate-400 tracking-tighter"
                                    >Total</motion.span>
                                    <motion.span 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-xl font-black text-slate-800 dark:text-white"
                                    >{feedingData.total}</motion.span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 w-full">
                                {[
                                    { label: 'Materna', value: feedingData.breastmilk, color: 'bg-orange-400', textColor: 'text-orange-500' },
                                    { label: 'Fórmula', value: feedingData.formula, color: 'bg-pink-500', textColor: 'text-pink-500' },
                                    { label: 'Sólidos', value: feedingData.solid, color: 'bg-emerald-400', textColor: 'text-emerald-500' }
                                ].map((item, idx) => {
                                    const perc = feedingData.total > 0 ? Math.round((item.value / feedingData.total) * 100) : 0;
                                    return (
                                        <motion.div 
                                            key={item.label}
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.6 + (idx * 0.1) }}
                                            className="flex items-center justify-between group/legend"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_8px_rgba(0,0,0,0.1)] group-hover/legend:scale-150 transition-transform`}></div>
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{item.label}</span>
                                            </div>
                                            <span className={`text-xs font-black ${item.textColor}`}>{perc}%</span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        <button className="group/btn w-full py-4 relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all active:scale-95">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                            <span className="relative z-10 text-xs font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 group-hover/btn:text-orange-500 transition-colors">
                                Registro de Dieta
                            </span>
                        </button>
                    </section>
                    <section className="relative group overflow-hidden glass-morphism bg-noise p-6 rounded-[2rem] w-full">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/10 blur-[50px] pointer-events-none"></div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white uppercase">Higiene y Confort</h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Frecuencia de Pañales</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-yellow-100 dark:bg-yellow-500/10 flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-yellow-500 dark:text-yellow-400 text-2xl font-bold">soap</span>
                            </div>
                        </div>

                        <div className="relative h-40 flex items-end justify-between px-2 mb-8 gap-3">
                             <div className="absolute inset-x-0 bottom-8 h-[1px] bg-slate-200 dark:bg-white/10 opacity-50"></div>
                             
                             <AnimatePresence mode="popLayout">
                                {(() => {
                                    const maxCount = Math.max(...diaperData.map(d => d.count), 1);
                                    return diaperData.map((d, i) => {
                                        const heightPercentage = (d.count / maxCount) * 100;
                                        const isToday = isSameDay(d.day, new Date());
                                        const label = format(d.day, period === 'Semana' ? 'EE' : 'dd', { locale: es }).substring(0, 2);

                                        return (
                                            <div key={d.day.toISOString()} className="flex flex-col items-center flex-1 h-full z-10">
                                                <div className="relative w-full h-full flex items-end justify-center group/diaper">
                                                    {d.count > 0 && (
                                                        <motion.div 
                                                            initial={{ scale: 0, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={{ delay: 0.8 + (i * 0.05) }}
                                                            className="absolute -top-8 bg-yellow-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg z-20"
                                                        >
                                                            {d.count}
                                                        </motion.div>
                                                    )}

                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: `${Math.max(heightPercentage, 10)}%`, opacity: 1 }}
                                                        transition={{ 
                                                            type: "spring",
                                                            damping: 15,
                                                            stiffness: 100,
                                                            delay: 0.4 + (i * 0.05) 
                                                        }}
                                                        className={`w-full max-w-[14px] rounded-full relative ${
                                                            isToday 
                                                            ? 'bg-gradient-to-t from-yellow-600 to-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                                                            : 'bg-slate-100 dark:bg-white/5 hover:bg-yellow-400/30 transition-colors'
                                                        }`}
                                                    >
                                                        {isToday && (
                                                            <motion.div 
                                                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                                                transition={{ duration: 2, repeat: Infinity }}
                                                                className="absolute inset-0 bg-white/30 rounded-full"
                                                            />
                                                        )}
                                                    </motion.div>
                                                </div>
                                                <span className={`mt-4 text-[9px] font-black uppercase tracking-tighter ${isToday ? 'text-yellow-600' : 'text-slate-400 dark:text-slate-600'}`}>
                                                    {label}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                             </AnimatePresence>
                        </div>

                        <button className="group/btn w-full py-4 relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all active:scale-95">
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                            <span className="relative z-10 text-xs font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 group-hover/btn:text-yellow-600 transition-colors">
                                Registro de Higiene
                            </span>
                        </button>
                    </section>
                </AnimatedList>
            </main>

            <NotificationSidebar
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                onUnreadChange={setUnreadCount}
            />
        </div>
    );
}
