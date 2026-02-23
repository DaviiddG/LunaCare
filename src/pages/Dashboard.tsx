import { useEffect, useState } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { BabyProfileModal } from '../components/BabyProfileModal';
import { AnimatedThemeToggler } from '../components/AnimatedThemeToggler';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr: string) {
    if (!dateStr) return '';
    return formatDistanceToNow(new Date(dateStr), { locale: es, addSuffix: true });
}

export function Dashboard() {
    const { user } = useAuth();
    const [babies, setBabies] = useState<any[]>([]);
    const [babyStats, setBabyStats] = useState<Record<string, any>>({});
    const [insightLoading, setInsightLoading] = useState(false);
    const [insightText, setInsightText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedBabyIndex, setSelectedBabyIndex] = useState(0);
    const navigate = useNavigate();



    useEffect(() => {
        if (user) fetchDashboardData();

        const handleRefresh = () => {
            if (user) fetchDashboardData();
        };

        window.addEventListener('luna-action-completed', handleRefresh);
        return () => window.removeEventListener('luna-action-completed', handleRefresh);
    }, [user]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        const { data: babyProfiles } = await dbHelpers.getAllBabyProfiles(user!.id);

        if (babyProfiles && babyProfiles.length > 0) {
            setBabies(babyProfiles);
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
            generateInsight(babyProfiles, stats, selectedBabyIndex);
        } else {
            setShowModal(true);
        }
        setIsLoading(false);
    };

    const generateInsight = async (babyProfiles: any[], stats: any, babyIndex: number) => {
        setInsightLoading(true);
        try {
            const currentBaby = babyProfiles[babyIndex];
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

    const currentBaby = babies[selectedBabyIndex];
    if (!currentBaby) return null;

    const stats = babyStats[currentBaby.id] || {};

    return (
        <div className="bg-background-light dark:bg-[#121212] min-h-screen pb-32">
            {/* Custom Header in Dashboard */}
            <header className="fixed top-0 w-full z-50 bg-background-light/80 dark:bg-[#121212]/80 backdrop-blur-2xl px-6 pt-12 pb-2">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm">
                            <span className="text-primary font-bold text-lg">{user?.email?.[0].toUpperCase() || 'D'}</span>
                        </div>
                        <div>
                            <h2 className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-none">Usuario</h2>
                            <p className="font-bold text-slate-800 dark:text-white capitalize">{user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Padre'}</p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <AnimatedThemeToggler className="w-10 h-10 shadow-sm border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none" />
                        <button className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95">
                            <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">notifications</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-28 px-5">
                {/* Baby Selector */}
                <div className="mb-6">
                    <div className="flex items-center space-x-4 overflow-x-auto hide-scrollbar py-2">
                        {babies.map((b, idx) => (
                            <button
                                key={b.id}
                                className={`flex flex-col items-center space-y-1 flex-shrink-0 transition-opacity ${selectedBabyIndex === idx ? 'opacity-100' : 'opacity-60'}`}
                                onClick={() => {
                                    setSelectedBabyIndex(idx);
                                    generateInsight(babies, babyStats, idx);
                                }}
                            >
                                <div className={`w-14 h-14 rounded-full p-1 border-2 bg-white dark:bg-slate-800 shadow-md ${selectedBabyIndex === idx ? 'border-primary' : 'border-transparent'}`}>
                                    <img
                                        alt={b.name}
                                        className="w-full h-full rounded-full object-cover"
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${b.name}`}
                                    />
                                </div>
                                <span className={`text-xs font-bold ${selectedBabyIndex === idx ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>{b.name}</span>
                            </button>
                        ))}
                        <button className="flex flex-col items-center space-y-1 flex-shrink-0" onClick={() => setShowModal(true)}>
                            <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                                <span className="material-symbols-rounded text-slate-400">add</span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">Añadir</span>
                        </button>
                    </div>
                </div>

                {/* Luna AI Active Greeting */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-slate-800 dark:to-indigo-950 p-6 mb-8 border border-white/50 dark:border-white/10 shadow-sm transition-all animate-fade-in">
                    <div className="flex items-start justify-between relative z-10">
                        <div className="max-w-[70%]">
                            <div className="inline-flex items-center space-x-2 bg-white/60 dark:bg-slate-700/60 px-3 py-1 rounded-full mb-3">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Luna AI Activa</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">
                                ¡Hola, <span className="capitalize">{user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Padre'}</span>! 👋<br />
                                <span className="text-primary font-bold">¿Cómo está {currentBaby.name} hoy?</span>
                            </h1>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                {insightLoading ? 'Luna está analizando...' : (insightText || `¡Es un buen día para cuidar a ${currentBaby.name}!`)}
                            </p>
                        </div>
                        <div className="absolute -right-2 -bottom-4 w-32 h-44 flex items-end">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                                <img
                                    className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-700 object-cover relative z-10"
                                    src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${currentBaby.name}`}
                                    alt="Luna AI"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-lg z-20 border border-slate-50 dark:border-slate-700">
                                    <span className="material-symbols-rounded text-primary text-lg">auto_awesome</span>
                                </div>
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
                        subtitle={stats.latestDiet ? `Hace ${timeAgo(stats.latestDiet.created_at)}` : "No registrado"}
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
                        title="Extracción"
                        subtitle={stats.latestPumping ? `${stats.latestPumping.amount}ml (${stats.latestPumping.side})` : "Ver historial"}
                        icon="airware"
                        color="#A592FF"
                        full
                        onClick={() => navigate('/diet')}
                        arrow
                    />
                </div>

                {/* Luna AI Tip Card */}
                <div className="mt-8 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center space-x-4">
                    <div className="bg-primary p-2 rounded-full flex-shrink-0 animate-pulse">
                        <span className="material-symbols-rounded text-white">lightbulb</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-primary uppercase">Luna AI Tip</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {insightText ? insightText : `Es probable que ${currentBaby.name} necesite atención pronto.`}
                        </p>
                    </div>
                </div>
            </main>

            {showModal && <BabyProfileModal onSave={handleDashboardSave} />}
        </div>
    );

    async function handleDashboardSave(profileData: any) {
        if (!user) return;
        await dbHelpers.upsertBabyProfile({ ...profileData, user_id: user.id });
        setShowModal(false);
        fetchDashboardData();
    }
}

function ActivityTile({ title, subtitle, icon, color, full, onClick, ai, history, plus, arrow }: any) {
    return (
        <button
            className={`${full ? 'col-span-2' : ''} group relative overflow-hidden p-5 rounded-xl text-left transition-transform active:scale-[0.98] card-shadow`}
            style={{ backgroundColor: color, color: color === '#FBCB43' ? '#1e293b' : 'white' }}
            onClick={onClick}
        >
            <div className={`flex ${full ? 'justify-between items-center' : 'flex-col h-full'} relative z-10`}>
                <div className={full ? 'flex items-center space-x-4' : ''}>
                    {full && title === 'Extracción' ? (
                        <div className="bg-white/20 p-3 rounded-full">
                            <span className="material-symbols-rounded text-3xl opacity-90">{icon}</span>
                        </div>
                    ) : (
                        <div className={full ? '' : 'flex justify-between items-start mb-4'}>
                            <span className={`material-symbols-rounded ${full ? 'text-4xl' : 'text-3xl'} opacity-90 ${full ? 'mb-2' : ''}`}>{icon}</span>
                            {!full && (ai || history || plus) && (
                                <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                                    <span className="material-symbols-rounded text-xs">{ai ? 'auto_awesome' : (history ? 'history' : 'add')}</span>
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <h3 className={`${full ? 'text-xl' : 'text-lg'} font-bold`}>{title}</h3>
                        <p className={`${full ? 'text-sm' : 'text-xs'} opacity-80 mt-1`}>{subtitle}</p>
                    </div>
                </div>

                {full && tileAiBadge(title, ai, arrow)}
            </div>

            {title === 'Sueño' && (
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-rounded text-[120px]">dark_mode</span>
                </div>
            )}
        </button>
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
