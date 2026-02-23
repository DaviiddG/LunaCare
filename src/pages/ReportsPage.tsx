import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBabies } from '../hooks/useBabies';
import { dbHelpers } from '../lib/db';
import { AnimatedList } from '../components/ui/animated-list';
import { NotificationSidebar } from '../components/NotificationSidebar';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

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

    useEffect(() => {
        if (selectedBaby && user) {
            fetchStats();
        }
    }, [period, selectedBaby, user]);

    const fetchStats = async () => {
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
    };

    const generateInsight = async (sleepLog: any[]) => {
        const { geminiHelpers } = await import('../lib/gemini');
        const totalHours = sleepLog.reduce((acc, curr) => acc + curr.hours, 0);
        const avg = totalHours / (sleepLog.filter(s => s.hours > 0).length || 1);

        const context = `El bebé durmió un promedio de ${avg.toFixed(1)} horas diarias esta semana.`;
        const prompt = `Escribe un comentario súper corto y amigable (máximo 1 línea) resumiendo cómo durmió según este promedio: ${avg.toFixed(1)}h. NO USES NEGRITAS, ASTERISCOS NI MARKDOWN.`;
        const res = await geminiHelpers.sendMessageWithContext(prompt, [], context);
        if (res.text) setInsightText(res.text.replace(/\*/g, ''));
    };

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
                            <div className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden flex-shrink-0">
                                <img alt="Luna AI Avatar" className="w-full h-full object-cover" src="/luna-avatar.png" />
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

                    <section className="bg-white dark:bg-slate-800 p-5 rounded-xl ios-shadow border border-slate-50 dark:border-slate-700 w-full" style={{ boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Resumen de Sueño</h3>
                                <p className="text-xs text-slate-500">Horas dormidas por día</p>
                            </div>
                            <span className="material-symbols-outlined text-sky-400 text-2xl">bedtime</span>
                        </div>
                        <div className={`flex items-end justify-between h-32 px-2 mb-4 overflow-x-auto gap-2`}>
                            {sleepData.map((d, i) => {
                                const heightPercentage = Math.min((d.hours / 18) * 100, 100);
                                const label = format(d.day, period === 'Semana' ? 'EEEEE' : 'dd', { locale: es }).substring(0, 1).toUpperCase();
                                const isToday = isSameDay(d.day, new Date());
                                return (
                                    <div key={i} className="flex flex-col items-center space-y-2 flex-shrink-0 min-w-[16px]">
                                        <div className="w-3 bg-sky-400/30 dark:bg-sky-400/20 rounded-t-full h-24 relative overflow-hidden">
                                            <div className="absolute bottom-0 w-full bg-sky-400 rounded-t-full transition-all duration-1000" style={{ height: `${heightPercentage}%` }}></div>
                                        </div>
                                        <span className={`text-[10px] font-bold ${isToday ? 'text-[#8c2bee]' : 'text-slate-400'}`}>{label}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <button className="w-full py-3 text-sm font-bold text-[#8c2bee] bg-[#8c2bee]/5 rounded-xl active:bg-[#8c2bee]/10 transition-colors">
                            Ver detalles
                        </button>
                    </section>

                    <section className="bg-white dark:bg-slate-800 p-5 rounded-xl ios-shadow border border-slate-50 dark:border-slate-700 w-full" style={{ boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Distribución de Alimentación</h3>
                                <p className="text-xs text-slate-500">Fuentes de nutrición</p>
                            </div>
                            <span className="material-symbols-outlined text-orange-300 text-2xl">restaurant</span>
                        </div>
                        <div className="flex items-center justify-around mb-6">
                            <div className="relative w-28 h-28">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <circle className="stroke-slate-100 dark:stroke-slate-700" cx="18" cy="18" fill="none" r="16" strokeWidth="4"></circle>

                                    {feedingData.total > 0 && (
                                        <>
                                            <circle className="stroke-orange-300 transition-all duration-1000" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${(feedingData.breastmilk / feedingData.total) * 100}, 100`} strokeWidth="4"></circle>
                                            <circle className="stroke-pink-400 transition-all duration-1000" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${(feedingData.formula / feedingData.total) * 100}, 100`} strokeDashoffset={`-${(feedingData.breastmilk / feedingData.total) * 100}`} strokeWidth="4"></circle>
                                            <circle className="stroke-emerald-300 transition-all duration-1000" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${(feedingData.solid / feedingData.total) * 100}, 100`} strokeDashoffset={`-${((feedingData.breastmilk + feedingData.formula) / feedingData.total) * 100}`} strokeWidth="4"></circle>
                                        </>
                                    )}
                                </svg>

                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-xs font-bold text-slate-400">Total</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-white">{feedingData.total > 0 ? feedingData.total + ' un.' : '0'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-orange-300"></div>
                                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Materna {feedingData.total > 0 ? Math.round((feedingData.breastmilk / feedingData.total) * 100) : 0}%</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-pink-400"></div>
                                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Fórmula {feedingData.total > 0 ? Math.round((feedingData.formula / feedingData.total) * 100) : 0}%</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-300"></div>
                                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Sólidos {feedingData.total > 0 ? Math.round((feedingData.solid / feedingData.total) * 100) : 0}%</span>
                                </div>
                            </div>
                        </div>

                        <button className="w-full py-3 text-sm font-bold text-[#8c2bee] bg-[#8c2bee]/5 rounded-xl active:bg-[#8c2bee]/10 transition-colors">
                            Ver detalles
                        </button>
                    </section>

                    <section className="bg-white dark:bg-slate-800 p-5 rounded-xl ios-shadow border border-slate-50 dark:border-slate-700 w-full" style={{ boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Frecuencia de Pañales</h3>
                                <p className="text-xs text-slate-500">Cambios diarios registrados</p>
                            </div>
                            <span className="material-symbols-outlined text-yellow-400 text-2xl">soap</span>
                        </div>
                        <div className="h-24 relative mb-6 overflow-x-auto">
                            <svg className="w-full h-full overflow-visible min-w-[300px]" viewBox="0 0 100 40" preserveAspectRatio="none">
                                {diaperData.length > 0 && (
                                    <>
                                        <path
                                            d={`M${diaperData.map((d, i) => `${(i / (diaperData.length - 1)) * 100},${40 - Math.min((d.count / 10) * 40, 40)}`).join(' L')}`}
                                            fill="none" stroke="#facc15" strokeLinecap="round" strokeWidth="2.5"
                                            className="transition-all duration-1000"
                                        />
                                        {diaperData.map((d, i) => {
                                            const x = (i / (diaperData.length - 1)) * 100;
                                            const y = 40 - Math.min((d.count / 10) * 40, 40);
                                            const isToday = isSameDay(d.day, new Date());
                                            return (
                                                <circle key={i} cx={x} cy={y} fill={isToday ? "#8c2bee" : "#facc15"} r={isToday ? "2.5" : "1.5"} className="transition-all duration-1000" />
                                            )
                                        })}
                                    </>
                                )}
                            </svg>
                            <div className="flex justify-between mt-2 px-1 min-w-[300px]">
                                {diaperData.map((d, i) => (
                                    <span key={i} className={`text-[9px] font-bold ${isSameDay(d.day, new Date()) ? 'text-[#8c2bee]' : 'text-slate-400'}`}>
                                        {format(d.day, period === 'Semana' ? 'EE' : 'dd', { locale: es }).substring(0, 2)}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button className="w-full py-3 text-sm font-bold text-[#8c2bee] bg-[#8c2bee]/5 rounded-xl active:bg-[#8c2bee]/10 transition-colors">
                            Ver detalles
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
