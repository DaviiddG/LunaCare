import { useEffect, useState, useRef } from 'react';
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
import { MagicCard } from '../components/ui/magic-card';

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
            reader.onloadend = () => {
                const base64 = reader.result as string;
                localStorage.setItem('luna_icon', base64);
                setLunaIcon(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="bg-background-light dark:bg-[#121212] min-h-screen pb-32">
            {/* Custom Header in Dashboard */}
            <header className="fixed top-0 w-full z-50 bg-background-light/80 dark:bg-[#121212]/80 backdrop-blur-2xl px-4 pt-12 pb-2">
                <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-primary/20 flex items-center justify-center border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm">
                            <span className="text-primary font-bold text-lg">{user?.email?.[0].toUpperCase() || 'D'}</span>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-none">Usuario</h2>
                            <p className="font-bold text-slate-800 dark:text-white capitalize truncate">{user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Padre'}</p>
                        </div>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                        <AnimatedThemeToggler className="w-10 h-10 shadow-sm border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none" />
                        <button
                            onClick={() => setIsNotificationOpen(true)}
                            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 relative"
                        >
                            <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-28 px-5">
                {/* Baby Selector */}
                <div className="mb-6">
                    <div className="flex items-center space-x-4 overflow-x-auto hide-scrollbar py-2">
                        {babies.map((b) => (
                            <button
                                key={b.id}
                                className={`flex flex-col items-center space-y-1 flex-shrink-0 transition-opacity ${selectedBaby?.id === b.id ? 'opacity-100' : 'opacity-60'}`}
                                onClick={() => {
                                    setSelectedBaby(b);
                                    generateInsight(babyStats, b);
                                }}
                            >
                                <div className={`w-14 h-14 rounded-full p-1 border-2 bg-white dark:bg-slate-800 shadow-md ${selectedBaby?.id === b.id ? 'border-primary' : 'border-transparent'}`}>
                                    <img
                                        alt={b.name}
                                        className="w-full h-full rounded-full object-cover"
                                        src={b.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.name}`}
                                    />
                                </div>
                                <span className={`text-xs font-bold ${selectedBaby?.id === b.id ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>{b.name}</span>
                            </button>
                        ))}
                        <button className="flex flex-col items-center space-y-1 flex-shrink-0" onClick={() => navigate('/add-baby')}>
                            <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                                <span className="material-symbols-rounded text-slate-400">add</span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">Añadir</span>
                        </button>
                    </div>
                </div>

                {/* Luna AI Active Greeting */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-slate-800 dark:to-indigo-950 p-5 mb-8 border border-white/50 dark:border-white/10 shadow-sm transition-all animate-fade-in">
                    <div className="flex items-start justify-between relative z-10 gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="inline-flex items-center space-x-2 bg-white/60 dark:bg-slate-700/60 px-3 py-1 rounded-full mb-3">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                    Luna {lunaProfile === 'serena' ? 'Noche Serena' : 'Día Activo'}
                                </span>
                            </div>
                            <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                                ¡Hola, <span className="capitalize">{user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Padre'}</span>! 👋{' '}
                                <AuroraText className="text-primary font-bold">¿Cómo está {selectedBaby?.name || 'tu bebé'} hoy?</AuroraText>
                            </h1>
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                {insightLoading ? 'Luna está analizando...' : (insightText || `¡Es un buen día para cuidar a ${selectedBaby?.name || 'tu bebé'}!`)}
                            </p>
                            <div className="mt-3 flex gap-2">
                                <ShimmerButton
                                    onClick={() => setIsLunaChatOpen(true)}
                                    shimmerColor="#ffffff"
                                    shimmerSize="0.1em"
                                    shimmerDuration="2s"
                                    background="#9D85E1"
                                    className="px-4 py-1.5 text-[10px] font-bold shadow-md h-10"
                                >
                                    Hablar con Luna
                                </ShimmerButton>
                                <button
                                    onClick={() => lunaFileInputRef.current?.click()}
                                    className="px-3 py-1.5 bg-white/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-lg shadow-sm border border-white/20 active:scale-95 transition-all flex items-center gap-1"
                                >
                                    <span className="material-symbols-rounded text-[14px]">edit_square</span>
                                    Personalizar Luna
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
                        <div className="flex-shrink-0 relative w-16 h-16">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                            <img
                                className="w-16 h-16 rounded-full border-4 border-white dark:border-slate-700 object-cover relative z-10"
                                src={lunaIcon}
                                alt="Luna AI"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-lg z-20 border border-slate-50 dark:border-slate-700">
                                <span className="material-symbols-rounded text-primary text-sm">auto_awesome</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <ActivityTile
                        title="Sueño"
                        subtitle={stats.latestSleep ? `Durmió ${timeAgo(stats.latestSleep.created_at)}` : `${currentBaby.name} está durmiendo`}
                        icon="bedtime"
                        color="#7ACDF1"
                        full
                        onClick={() => navigate('/sleep')}
                        ai
                    />
                    <ActivityTile
                        title="Lactancia"
                        subtitle="Sugerido pronto"
                        icon="child_care"
                        color="#FF9D76"
                        onClick={() => navigate('/diet')}
                        ai
                    />
                    <ActivityTile
                        title="Biberón"
                        subtitle={stats.latestDiet ? timeAgo(stats.latestDiet.created_at) : "No registrado"}
                        icon="baby_changing_station"
                        color="#FF8C69"
                        onClick={() => navigate('/bottle')}
                        history
                    />
                    <ActivityTile
                        title="Sólidos"
                        subtitle={stats.latestSolids ? stats.latestSolids.foods?.[0] || 'Sólidos' : "Puré registrado"}
                        icon="restaurant"
                        color="#D45079"
                        onClick={() => navigate('/solids')}
                        ai
                    />
                    <ActivityTile
                        title="Pañal"
                        subtitle={stats.latestDiaper ? `Limpio ${timeAgo(stats.latestDiaper.created_at)}` : "Limpio hace poco"}
                        icon="soap"
                        color="#FBCB43"
                        onClick={() => navigate('/diapers')}
                        plus
                    />
                    <ActivityTile
                        title="Historial"
                        subtitle="Últimos eventos"
                        icon="history"
                        color="#A592FF"
                        full
                        onClick={() => navigate('/history')}
                        arrow
                    />
                </div>


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

function ActivityTile({ title, subtitle, icon, color, full, onClick, ai, history, plus, arrow }: any) {
    return (
        <MagicCard
            className={`cursor-pointer border-none ${full ? 'col-span-2' : 'col-span-1'} w-full text-left rounded-xl active:scale-[0.98] transition-transform card-shadow`}
            onClick={onClick}
            bgColor={color}
            gradientColor={color === '#FBCB43' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'}
            gradientFrom="rgba(255,255,255,0.5)"
            gradientTo="rgba(255,255,255,0)"
            gradientSize={250}
        >
            <div
                className={`group relative overflow-hidden p-4 rounded-xl text-left w-full h-full`}
                style={{ color: color === '#FBCB43' ? '#1e293b' : 'white' }}
            >
                <div className={`flex ${full ? 'justify-between items-center' : 'flex-col h-full'} relative z-10 w-full`}>
                    <div className={full ? 'flex items-center space-x-3 w-full' : 'w-full'}>
                        <div className={full ? '' : 'flex justify-between items-start mb-3'}>
                            <span className={`material-symbols-rounded ${full ? 'text-3xl' : 'text-2xl'} opacity-90 ${full ? 'mb-1' : ''}`}>{icon}</span>
                            {!full && (ai || history || plus) && (
                                <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                    <span className="material-symbols-rounded text-xs">{ai ? 'auto_awesome' : (history ? 'history' : 'add')}</span>
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 text-left flex-1">
                            <h3 className={`${full ? 'text-base' : 'text-sm'} font-bold leading-tight`}>{title}</h3>
                            <p className="text-xs opacity-80 mt-0.5 line-clamp-1">{subtitle}</p>
                        </div>
                    </div>

                    {full && tileAiBadge(title, ai, arrow)}
                </div>

                {title === 'Sueño' && (
                    <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-rounded text-[80px]">dark_mode</span>
                    </div>
                )}
            </div>
        </MagicCard>
    );
}

function tileAiBadge(title: string, ai: boolean, arrow: boolean) {
    if (title === 'Sueño' && ai) {
        return (
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md border border-white/30 flex items-center space-x-1">
                <span className="material-symbols-rounded text-sm">auto_awesome</span>
                <span className="text-[10px] font-bold">Luna AI</span>
            </div>
        );
    }
    if (arrow) {
        return <span className="material-symbols-rounded opacity-40">chevron_right</span>;
    }
    return null;
}
