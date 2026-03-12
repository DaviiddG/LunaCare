import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useBabies } from '../hooks/useBabies';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { AnimatedThemeToggler } from '../components/AnimatedThemeToggler';
import { NotificationSidebar } from '../components/NotificationSidebar';
import { useNavigate } from 'react-router-dom';
import { LunaChatModal } from '../components/LunaChatModal';
import { AuroraText } from '../components/ui/aurora-text';
import { ShimmerButton } from '../components/ui/shimmer-button';
import { BentoGrid, BentoCard } from '../components/ui/bento-grid';
import { cn } from '../lib/utils';

function timeAgo(dateStr: string) {
    if (!dateStr) return '';
    return formatDistanceToNow(new Date(dateStr), { locale: es, addSuffix: true });
}

export function Dashboard() {
    const { user } = useAuth();
    const { babies, selectedBaby, setSelectedBaby } = useBabies();
    const [babyStats, setBabyStats] = useState<Record<string, any>>({});
    const [insightLoading, setInsightLoading] = useState(false);
    const [insightText, setInsightText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isLunaChatOpen, setIsLunaChatOpen] = useState(false);
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');
    const [lunaProfile, setLunaProfile] = useState(localStorage.getItem('luna_profile') || 'serena');
    const lunaFileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();



    useEffect(() => {
        if (user) fetchDashboardData();

        const handleRefresh = () => {
            if (user) fetchDashboardData();
        };

        window.addEventListener('luna-action-completed', handleRefresh);
        return () => window.removeEventListener('luna-action-completed', handleRefresh);
    }, [user]);

    useEffect(() => {
        const handleSettingsUpdate = () => {
            setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
            setLunaProfile(localStorage.getItem('luna_profile') || 'serena');
        };
        window.addEventListener('luna-settings-updated', handleSettingsUpdate);
        return () => window.removeEventListener('luna-settings-updated', handleSettingsUpdate);
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        const { data: babyProfiles } = await dbHelpers.getAllBabyProfiles(user!.id);

        if (babyProfiles && babyProfiles.length > 0) {
            const stats: Record<string, any> = {};

            for (const baby of babyProfiles) {
                const [dietRes, diaperRes, sleepRes, solidsRes] = await Promise.all([
                    dbHelpers.getDiets(baby.id),
                    dbHelpers.getDiapers(baby.id),
                    dbHelpers.getSleepLogs(baby.id),
                    dbHelpers.getSolids(baby.id),
                ]);
                stats[baby.id] = {
                    latestDiet: dietRes.data?.[0] || null,
                    latestDiaper: diaperRes.data?.[0] || null,
                    latestSleep: sleepRes.data?.[0] || null,
                    latestSolids: solidsRes.data?.[0] || null,
                    latestPumping: null,
                };
            }
            setBabyStats(stats);
            // Generate insight for the currently selected baby
            const currentBabyForInsight = selectedBaby || babyProfiles[0];
            generateInsight(stats, currentBabyForInsight);
        } else {
            navigate('/add-baby');
        }
        setIsLoading(false);
    };

    const generateInsight = async (stats: any, currentBaby: any) => {
        setInsightLoading(true);
        setInsightText(null);
        try {
            if (!currentBaby) return;

            const babyData = stats[currentBaby.id];
            const dataContext = `
Bebé: ${currentBaby.name}
Última comida: ${babyData?.latestDiet ? timeAgo(babyData.latestDiet.created_at) : "ninguna"}
Último sueño: ${babyData?.latestSleep ? timeAgo(babyData.latestSleep.created_at) : "ninguno"}
Último pañal: ${babyData?.latestDiaper ? timeAgo(babyData.latestDiaper.created_at) : "ninguno"}
`;

            const { geminiHelpers } = await import('../lib/gemini');
            const prompt = `Eres Luna, experta en cuidado de bebés. Analiza a ${currentBaby.name} y da un consejo de 1 línea corto y útil. IMPORTANTE: El único bebé del que debes hablar es ${currentBaby.name}, NO inventes nombres.`;
            const chatModel = [{ role: 'user' as const, parts: [{ text: prompt }] }];
            const res = await geminiHelpers.sendMessageWithContext(prompt, chatModel, dataContext);
            if (res.text) setInsightText(res.text);
        } catch (e) {
            console.error(e);
        }
        setInsightLoading(false);
    };



    if (isLoading) return <div className="p-8 text-center bg-background-light dark:bg-[#121212] min-h-screen text-slate-500">Cargando...</div>;

    const currentBaby = selectedBaby || babies[0];
    if (!currentBaby) return null;

    const stats = selectedBaby ? babyStats[selectedBaby.id] || {} : {};

    const handleLunaIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                localStorage.setItem('luna_icon', base64);
                setLunaIcon(base64);

                // Sync to database
                if (user) {
                    await dbHelpers.updateUserSettings(user.id, {
                        luna_icon: base64
                    });
                }

                window.dispatchEvent(new Event('luna-settings-updated'));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="bg-background-light dark:bg-[#121212] min-h-screen pb-32">
            <header className="fixed top-0 w-full z-50 px-4 pt-12 pb-4 transition-all duration-300 bg-background-light/40 dark:bg-[#121212]/40 backdrop-blur-xl border-b border-white/10 dark:border-white/5">
                <div className="flex justify-between items-center gap-2 max-w-4xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center space-x-3 min-w-0 flex-1"
                    >
                        <div className="w-10 h-10 flex-shrink-0 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-white/20 dark:border-white/10 overflow-hidden shadow-2xl relative group">
                            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="text-primary font-black text-lg relative z-10">{user?.email?.[0].toUpperCase() || 'D'}</span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-[10px] text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Bienvenido</h2>
                            <p className="font-black text-slate-800 dark:text-white capitalize truncate">{user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Padre'}</p>
                        </div>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex space-x-2 flex-shrink-0"
                    >
                        <AnimatedThemeToggler className="w-11 h-11 shadow-2xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-slate-800/40 backdrop-blur-lg focus:outline-none rounded-2xl" />
                        <button
                            onClick={() => setIsNotificationOpen(true)}
                            className="w-11 h-11 rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-lg flex items-center justify-center shadow-2xl border border-white/20 dark:border-white/5 active:scale-95 relative group"
                        >
                            <span className="material-symbols-rounded text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-lg">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </motion.div>
                </div>
            </header>

            <main className="pt-32 px-5 max-w-4xl mx-auto">
                {/* Baby Selector */}
                <div className="mb-10">
                    <div className="flex items-center space-x-5 overflow-x-auto hide-scrollbar py-4 px-2">
                        {babies.map((b, idx) => (
                            <motion.button
                                key={b.id}
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`flex flex-col items-center space-y-3 flex-shrink-0 transition-all duration-500 ${selectedBaby?.id === b.id ? 'scale-110' : 'opacity-40 hover:opacity-70'}`}
                                onClick={() => {
                                    setSelectedBaby(b);
                                    generateInsight(babyStats, b);
                                }}
                            >
                                <div className={`relative w-16 h-16 rounded-[1.5rem] p-0.5 transition-all duration-500 ${selectedBaby?.id === b.id ? 'bg-gradient-to-br from-primary to-indigo-600 shadow-[0_10px_25px_rgba(157,133,225,0.4)] rotate-3' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                    <div className="w-full h-full rounded-[1.4rem] overflow-hidden border-2 border-white dark:border-slate-900 bg-white dark:bg-slate-800">
                                        <img
                                            alt={b.name}
                                            className="w-full h-full rounded-full object-cover p-1"
                                            src={b.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.name}`}
                                        />
                                    </div>
                                    {selectedBaby?.id === b.id && (
                                        <motion.div 
                                            layoutId="active-baby-glow"
                                            className="absolute inset-0 bg-primary/20 blur-xl -z-10 rounded-full"
                                        />
                                    )}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedBaby?.id === b.id ? 'text-primary' : 'text-slate-400 dark:text-slate-600'}`}>{b.name}</span>
                            </motion.button>
                        ))}
                        <button className="flex flex-col items-center space-y-3 flex-shrink-0 group" onClick={() => navigate('/add-baby')}>
                            <div className="w-16 h-16 rounded-[1.5rem] border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-all">
                                <span className="material-symbols-rounded text-slate-400 group-hover:text-primary">add</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary/70">Añadir</span>
                        </button>
                    </div>
                </div>

                {/* Luna AI Active Greeting */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-[2.5rem] glass-morphism bg-noise p-7 mb-10 group"
                >
                    {/* Background floating glows */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 blur-[60px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 blur-[50px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>

                    <div className="flex items-start justify-between relative z-10 gap-5">
                        <div className="flex-1 min-w-0">
                            <div className="inline-flex items-center space-x-2 bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/5 px-4 py-1.5 rounded-full mb-5 backdrop-blur-md">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary dark:text-primary-light">
                                    Luna {lunaProfile === 'serena' ? 'Noche Serena' : 'Día Activo'}
                                </span>
                            </div>
                            <h1 className="text-xl font-black text-slate-800 dark:text-white leading-[1.1] mb-3">
                                ¡Hola, <span className="capitalize">{user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Padre'}</span>! 👋{' '}
                                <AuroraText className="text-primary font-black drop-shadow-sm">¿Cómo está {selectedBaby?.name || 'tu bebé'} hoy?</AuroraText>
                            </h1>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-6 italic">
                                "{insightLoading ? 'Luna está analizando patrones...' : (insightText || `¡Es un buen día para cuidar a ${selectedBaby?.name || 'tu bebé'}!`)}"
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <ShimmerButton
                                    onClick={() => setIsLunaChatOpen(true)}
                                    shimmerColor="#ffffff"
                                    shimmerSize="0.1em"
                                    shimmerDuration="2s"
                                    background="linear-gradient(135deg, #9D85E1, #8c2bee)"
                                    className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(140,43,238,0.3)] h-11 rounded-2xl"
                                >
                                    Chat con Luna
                                </ShimmerButton>
                                <button
                                    onClick={() => lunaFileInputRef.current?.click()}
                                    className="px-5 py-2.5 bg-white/60 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-sm border border-white/20 dark:border-white/5 active:scale-95 transition-all flex items-center gap-2 hover:bg-white/80 dark:hover:bg-white/10"
                                >
                                    <span className="material-symbols-rounded text-[16px]">magic_button</span>
                                    Estilo
                                </button>
                                <input
                                    type="file"
                                    ref={lunaFileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleLunaIconChange}
                                />
                            </div>
                        </div>
                        <div className="flex-shrink-0 relative w-24 h-24">
                            <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-pulse"></div>
                            <div className="relative w-24 h-24 rounded-[2rem] p-1 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden z-10 group-hover:rotate-6 transition-transform duration-500">
                                <img
                                    className="w-full h-full rounded-[1.8rem] object-cover"
                                    src={lunaIcon}
                                    alt="Luna AI"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-2xl shadow-2xl z-20 border-2 border-white dark:border-slate-900 animate-bounce">
                                <span className="material-symbols-rounded text-white text-base font-black">auto_awesome</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Actividades principales */}
                <section className="mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Actividades</h2>
                        <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/5 ml-4"></div>
                    </div>
                    
                    <BentoGrid className="mb-8">
                        {[
                            {
                                name: "Sueño",
                                description: stats?.latestSleep ? `Durmió ${timeAgo(stats?.latestSleep.created_at)}` : `${currentBaby?.name || 'Bebé'} descansa`,
                                icon: "bedtime",
                                color: "#7ACDF1",
                                className: "col-span-2",
                                onClick: () => navigate('/sleep'),
                                delay: 0.1
                            },
                            {
                                name: "Lactancia",
                                description: "Lactancia",
                                icon: "child_care",
                                color: "#FF9D76",
                                className: "col-span-1",
                                onClick: () => navigate('/diet'),
                                delay: 0.2
                            },
                            {
                                name: "Biberón",
                                description: stats?.latestDiet ? `Hace ${timeAgo(stats?.latestDiet.created_at)}` : 'Pendiente',
                                icon: "baby_changing_station",
                                color: "#FF8C69",
                                className: "col-span-1",
                                onClick: () => navigate('/bottle'),
                                delay: 0.3
                            },
                            {
                                name: "Sólidos",
                                description: stats?.latestSolids ? (stats?.latestSolids.foods?.[0] || `Hace ${timeAgo(stats?.latestSolids.created_at)}`) : "Pendiente",
                                icon: "restaurant",
                                color: "#D45079",
                                className: "col-span-1",
                                onClick: () => navigate('/solids'),
                                delay: 0.4
                            },
                            {
                                name: "Pañal",
                                description: stats?.latestDiaper ? `Limpio hace ${timeAgo(stats?.latestDiaper.created_at)}` : 'Sucio',
                                icon: "soap",
                                color: "#FBCB43",
                                className: "col-span-1",
                                onClick: () => navigate('/diapers'),
                                delay: 0.5
                            },
                            {
                                name: "Historial",
                                description: "Eventos hoy",
                                icon: "history",
                                color: "#A592FF",
                                className: "col-span-2",
                                onClick: () => navigate('/history'),
                                delay: 0.6
                            }
                        ].map((card) => (
                            <motion.div
                                key={card.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: card.delay, duration: 0.5 }}
                                className={cn("inline-block w-full h-full", card.className)}
                            >
                                <BentoCard
                                    {...card}
                                    className="w-full h-full border border-white/20 dark:border-white/5 glass-morphism bg-noise rounded-[2.5rem] overflow-hidden"
                                    background={
                                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.07] group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 pointer-events-none">
                                            <span className="material-symbols-rounded text-[100px]">{card.icon}</span>
                                        </div>
                                    }
                                />
                            </motion.div>
                        ))}
                    </BentoGrid>
                </section>
            </main>

            <NotificationSidebar
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                onUnreadChange={setUnreadCount}
            />

            {isLunaChatOpen && (
                <LunaChatModal
                    isOpen={isLunaChatOpen}
                    onClose={() => setIsLunaChatOpen(false)}
                />
            )}
        </div>
    );
}
