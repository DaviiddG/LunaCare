import { useEffect, useState } from 'react';
import { Droplet, Moon, Baby, PlusCircle } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow, differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { BabyProfileModal } from '../components/BabyProfileModal';

function getBabyAge(birthDate: string): string {
    if (!birthDate) return '';
    const bd = new Date(birthDate);
    const years = differenceInYears(new Date(), bd);
    if (years >= 1) return `${years} año${years > 1 ? 's' : ''}`;
    const months = differenceInMonths(new Date(), bd);
    if (months >= 1) return `${months} mes${months > 1 ? 'es' : ''}`;
    const days = differenceInDays(new Date(), bd);
    return `${days} día${days !== 1 ? 's' : ''}`;
}

function timeAgo(dateStr: string) {
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
    const [hoveredBaby, setHoveredBaby] = useState<string | null>(null);

    const parentName: string = (user?.user_metadata?.full_name as string) || '';
    const role: string = (user?.user_metadata?.role as string) || '';
    const isMother = role === 'madre';
    const isFather = role === 'padre';
    const greeting = isMother
        ? `¡Hola, Mamá ${parentName}!`
        : isFather
            ? `¡Hola, Papá ${parentName}!`
            : `¡Hola, ${parentName}!`;
    const parentEmoji = isMother ? '🤱' : isFather ? '👨‍🍼' : '🍼';
    const subtitlePrefix = isMother ? 'Mamá de' : isFather ? 'Papá de' : 'Cuidando a';
    const addBabyText = isFather
        ? '¿Eres papá de más hijos? Agregar bebé'
        : isMother
            ? '¿Eres mamá de más hijos? Agregar bebé'
            : '¿Tienes más hijos? Agregar bebé';

    useEffect(() => {
        if (user) fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        const { data: babyProfiles } = await dbHelpers.getAllBabyProfiles(user!.id);

        if (babyProfiles && babyProfiles.length > 0) {
            setBabies(babyProfiles);
            const stats: Record<string, any> = {};

            for (const baby of babyProfiles) {
                const [dietRes, diaperRes, sleepRes] = await Promise.all([
                    dbHelpers.getDiets(baby.id),
                    dbHelpers.getDiapers(baby.id),
                    dbHelpers.getSleepLogs(baby.id),
                ]);
                stats[baby.id] = {
                    latestDiet: dietRes.data?.[0] || null,
                    latestDiaper: diaperRes.data?.[0] || null,
                    latestSleep: sleepRes.data?.[0] || null,
                };
            }
            setBabyStats(stats);
            // Autogenerate an insight for the first baby
            generateInsight(babyProfiles[0], stats[babyProfiles[0].id]);
        } else {
            setShowModal(true);
        }
        setIsLoading(false);
    };

    const generateInsight = async (baby: any, stats: any) => {
        const cacheKey = `luna_insight_${baby.id}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                // Check if less than 4 hours old
                if (Date.now() - parsed.timestamp < 4 * 60 * 60 * 1000) {
                    setInsightText(parsed.text);
                    return;
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        setInsightLoading(true);
        try {
            const { geminiHelpers } = await import('../lib/gemini');
            const dataContext = `
Bebé: ${baby.name}
Última comida: ${stats.latestDiet ? timeAgo(stats.latestDiet.created_at) + " de " + stats.latestDiet.type : "ninguna"}
Último pañal: ${stats.latestDiaper ? timeAgo(stats.latestDiaper.created_at) + " (" + stats.latestDiaper.status + ")" : "ninguno"}
Último sueño: ${stats.latestSleep ? timeAgo(stats.latestSleep.created_at) + " duración: " + stats.latestSleep.duration : "ninguno"}
            `.trim();
            const prompt = `Basado en esta info actual del bebé, dale un solo consejo o recomendación súper proactiva (MÁXIMO 2 líneas cortas) a ${isMother ? 'su mamá' : isFather ? 'su papá' : 'sus padres'}. Ej: "Asegúrate de preparar el siguiente biberón porque hace 3 horas que comió".\n${dataContext}`;

            const chatModel = [{ role: 'user' as 'user', parts: [{ text: prompt }] }];
            const res = await geminiHelpers.sendMessageWithContext(prompt, chatModel, dataContext);
            if (res.text) {
                setInsightText(res.text);
                localStorage.setItem(cacheKey, JSON.stringify({
                    text: res.text,
                    timestamp: Date.now()
                }));
            }
        } catch (e) {
            console.error("No se pudo generar insight", e);
        }
        setInsightLoading(false);
    };

    const handleModalSave = async (profileData: any) => {
        if (!user) return;
        const { error } = await dbHelpers.upsertBabyProfile({
            user_id: user.id,
            name: profileData.name,
            birth_date: profileData.birth_date,
            weight: profileData.weight || 0,
            height: profileData.height || 0,
            gender: profileData.gender || '',
        });
        if (!error) {
            setShowModal(false);
            fetchDashboardData();
        } else {
            throw new Error(error.message);
        }
    };

    if (isLoading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '15px' }}>
            <div className="pulse-ring" style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Baby size={28} color="white" />
            </div>
            <p style={{ color: 'var(--color-text-light)' }}>Cargando...</p>
        </div>
    );

    return (
        <>
            {showModal && <BabyProfileModal onSave={handleModalSave} />}

            <div className="animate-fade-in">
                {/* ── Parent Greeting ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem', boxShadow: '0 4px 15px color-mix(in srgb, var(--color-primary) 40%, transparent)',
                        flexShrink: 0, transition: 'transform 0.3s ease',
                    }}>
                        {parentEmoji}
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.2 }}>{greeting}</h2>
                        <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: '0.88rem' }}>
                            {subtitlePrefix}{' '}
                            {babies.length > 0 ? babies.map((b: any) => b.name).join(' y ') : 'tu bebé'}
                        </p>
                    </div>
                </div>

                {/* ── El Ojo de Luna (AI Insight) ── */}
                {babies.length > 0 && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.3))',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '20px',
                        padding: '16px',
                        marginBottom: '24px',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex', gap: '12px', alignItems: 'flex-start'
                    }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '20px',
                            background: 'var(--color-primary)', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                            boxShadow: 'inset 0 -2px 5px rgba(0,0,0,0.1)'
                        }}>✨</div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--color-primary-dark)' }}>Luna dice...</h4>
                            {insightLoading ? (
                                <div style={{ height: '20px', background: 'var(--color-surface-variant)', borderRadius: '10px', width: '80%', animation: 'pulse 1.5s infinite' }} />
                            ) : (
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.4 }}>
                                    {insightText || "Todo se ve bien por ahora. ¡Disfruta el día con tu bebé!"}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Baby cards with stats ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                    {babies.map((baby, i) => {
                        const isHovered = hoveredBaby === baby.id;
                        const isBoy = baby.gender?.toLowerCase() === 'niño';
                        const babyColor = isBoy ? '#3b82f6' : 'var(--color-primary-dark)';
                        const babyGrad = isBoy
                            ? 'linear-gradient(135deg, #93c5fd, #3b82f6)'
                            : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))';

                        return (
                            <div key={baby.id}
                                onMouseEnter={() => setHoveredBaby(baby.id)}
                                onMouseLeave={() => setHoveredBaby(null)}
                                style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '20px',
                                    boxShadow: isHovered
                                        ? `0 8px 32px color-mix(in srgb, ${babyColor} 25%, transparent), var(--shadow-md)`
                                        : 'var(--shadow-sm)',
                                    transform: isHovered ? 'translateY(-3px) scale(1.01)' : 'translateY(0) scale(1)',
                                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    border: `1px solid ${isHovered ? babyColor + '44' : 'var(--color-border)'}`,
                                    overflow: 'hidden',
                                    animationDelay: `${i * 0.07}s`
                                }}
                            >
                                {/* Top accent bar */}
                                <div style={{ height: '4px', background: babyGrad }} />

                                {/* Baby info row */}
                                <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '52px', height: '52px', borderRadius: '50%',
                                        background: babyGrad,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.5rem', flexShrink: 0,
                                        boxShadow: `0 4px 12px color-mix(in srgb, ${babyColor} 35%, transparent)`,
                                        transition: 'transform 0.3s ease',
                                        transform: isHovered ? 'rotate(-10deg) scale(1.1)' : 'rotate(0deg) scale(1)',
                                    }}>
                                        {baby.gender?.toLowerCase() === 'niño' ? '👦' : '👧'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-text)' }}>{baby.name}</div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-light)', display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '3px' }}>
                                            {baby.birth_date && <span>🎂 {getBabyAge(baby.birth_date)}</span>}
                                            {baby.weight > 0 && <span>⚖️ {baby.weight} kg</span>}
                                            {baby.height > 0 && <span>📏 {baby.height} cm</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats for this baby */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--color-border)', borderTop: '1px solid var(--color-border)' }}>
                                    {/* Last feeding */}
                                    <StatCell
                                        color="var(--color-primary-dark)"
                                        emoji={<Droplet size={13} />}
                                        label="Última Comida"
                                        value={babyStats[baby.id]?.latestDiet ? timeAgo(babyStats[baby.id].latestDiet.created_at) : '—'}
                                        sub={babyStats[baby.id]?.latestDiet
                                            ? (babyStats[baby.id].latestDiet.type === 'breast' ? 'Pecho' : babyStats[baby.id].latestDiet.type === 'formula' ? 'Fórmula' : 'Sólidos') +
                                            (babyStats[baby.id].latestDiet.amount ? ` · ${babyStats[baby.id].latestDiet.amount}ml` : '')
                                            : 'Sin registros'}
                                    />
                                    {/* Last diaper change */}
                                    <StatCell
                                        color="var(--color-success)"
                                        emoji={<Baby size={13} />}
                                        label="Último Cambio de Pañal"
                                        value={babyStats[baby.id]?.latestDiaper ? timeAgo(babyStats[baby.id].latestDiaper.created_at) : '—'}
                                        sub={babyStats[baby.id]?.latestDiaper
                                            ? (babyStats[baby.id].latestDiaper.status === 'wet' ? 'Mojado' : 'Sucio')
                                            : 'Sin registros'}
                                    />
                                </div>
                                {/* Last sleep — full width */}
                                <div style={{ borderTop: '1px solid var(--color-border)' }}>
                                    <StatCell
                                        color="var(--color-secondary-dark)"
                                        emoji={<Moon size={13} />}
                                        label="Último Sueño"
                                        value={babyStats[baby.id]?.latestSleep ? babyStats[baby.id].latestSleep.duration : '—'}
                                        sub={babyStats[baby.id]?.latestSleep ? timeAgo(babyStats[baby.id].latestSleep.created_at) : 'Sin registros'}
                                        wide
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Add another baby ── */}
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        width: '100%', padding: '16px',
                        borderRadius: '18px', border: '2px dashed var(--color-border)',
                        background: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        color: 'var(--color-text-light)', fontWeight: 600, fontSize: '0.95rem',
                        transition: 'all 0.25s ease',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-dark)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--color-primary) 6%, transparent)';
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.01)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-light)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    }}
                >
                    <PlusCircle size={22} />
                    {addBabyText}
                </button>
            </div >
        </>
    );
}

// ── Small reusable Stat Cell ──────────────────────────────
function StatCell({ color, emoji, label, value, sub, wide }: {
    color: string; emoji: React.ReactNode;
    label: string; value: string; sub: string; wide?: boolean;
}) {
    const [hov, setHov] = useState(false);
    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                padding: '12px 14px',
                background: hov ? `color-mix(in srgb, ${color} 8%, var(--color-surface))` : 'var(--color-surface)',
                transition: 'background 0.2s ease',
                cursor: 'default',
                gridColumn: wide ? 'span 2' : undefined,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color, marginBottom: '5px', fontSize: '0.78rem', fontWeight: 700 }}>
                {emoji} {label}
            </div>
            <div style={{ fontWeight: 700, fontSize: wide ? '1.3rem' : '0.95rem', color: 'var(--color-text)', transition: 'transform 0.2s', transform: hov ? 'scale(1.03)' : 'scale(1)' }}>
                {value}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text-light)', marginTop: '2px' }}>{sub}</div>
        </div>
    );
}
