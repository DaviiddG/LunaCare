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

export function Dashboard() {
    const { user } = useAuth();
    const [babies, setBabies] = useState<any[]>([]);
    const [latestDiet, setLatestDiet] = useState<any>(null);
    const [latestDiaper, setLatestDiaper] = useState<any>(null);
    const [latestSleep, setLatestSleep] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Extract parent info from Supabase user_metadata
    const parentName: string = (user?.user_metadata?.full_name as string) || '';
    const role: string = (user?.user_metadata?.role as string) || 'madre';
    const isParentMother = role === 'madre';
    const greeting = isParentMother ? `¡Hola, Mamá ${parentName}!` : `¡Hola, Papá ${parentName}!`;
    const parentEmoji = isParentMother ? '🤱' : '👨‍🍼';

    useEffect(() => {
        if (user) fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        setIsLoading(true);

        const [babyRes, dietRes, diaperRes, sleepRes] = await Promise.all([
            dbHelpers.getAllBabyProfiles(user!.id),
            dbHelpers.getDiets(),
            dbHelpers.getDiapers(),
            dbHelpers.getSleepLogs(),
        ]);

        if (babyRes.data) setBabies(babyRes.data);
        // If no babies yet, show the modal to add the first one
        if (!babyRes.data || babyRes.data.length === 0) setShowModal(true);

        if (dietRes.data && dietRes.data.length > 0) setLatestDiet(dietRes.data[0]);
        if (diaperRes.data && diaperRes.data.length > 0) setLatestDiaper(diaperRes.data[0]);
        if (sleepRes.data && sleepRes.data.length > 0) setLatestSleep(sleepRes.data[0]);

        setIsLoading(false);
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
            console.error('Error saving baby profile:', error);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '15px' }}>
                <div className="pulse-ring" style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Baby size={28} color="white" />
                </div>
                <p style={{ color: 'var(--color-text-light)' }}>Cargando...</p>
            </div>
        );
    }

    return (
        <>
            {showModal && <BabyProfileModal onSave={handleModalSave} />}

            <div className="animate-fade-in">
                {/* Parent Greeting */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem', boxShadow: '0 4px 15px rgba(232,134,159,0.4)',
                        flexShrink: 0
                    }}>
                        {parentEmoji}
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.2 }}>{greeting}</h2>
                        <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: '0.88rem' }}>
                            {isParentMother ? 'Mamá de' : 'Papá de'}{' '}
                            {babies.length > 0 ? babies.map(b => b.name).join(' y ') : 'tu bebé'}
                        </p>
                    </div>
                </div>

                {/* Baby cards */}
                {babies.map((baby, i) => (
                    <div key={baby.id} className="card animate-scale-in" style={{
                        marginBottom: '16px',
                        borderTop: `4px solid ${baby.gender === 'niño' ? '#60a5fa' : 'var(--color-primary)'}`,
                        animationDelay: `${i * 0.06}s`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            {/* Baby avatar */}
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '50%',
                                background: baby.gender === 'niño'
                                    ? 'linear-gradient(135deg, #93c5fd, #3b82f6)'
                                    : 'linear-gradient(135deg, #f9a8d4, #ec4899)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.5rem', flexShrink: 0,
                                boxShadow: `0 4px 12px ${baby.gender === 'niño' ? 'rgba(59,130,246,0.35)' : 'rgba(236,72,153,0.35)'}`
                            }}>
                                {baby.gender === 'niño' ? '👦' : '👧'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{baby.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
                                    {baby.birth_date && (
                                        <span>🎂 {getBabyAge(baby.birth_date)}</span>
                                    )}
                                    {baby.weight > 0 && <span>⚖️ {baby.weight} kg</span>}
                                    {baby.height > 0 && <span>📏 {baby.height} cm</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                    <div className="card animate-scale-in" style={{ padding: '16px', animationDelay: '0.1s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--color-primary-dark)', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                            <Droplet size={14} /> Última Comida
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                            {latestDiet
                                ? formatDistanceToNow(new Date(latestDiet.created_at), { locale: es, addSuffix: true })
                                : '—'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: '3px' }}>
                            {latestDiet
                                ? (latestDiet.type === 'breast' ? 'Pecho' : latestDiet.type === 'formula' ? 'Fórmula' : 'Sólidos') +
                                (latestDiet.amount ? ` · ${latestDiet.amount}ml` : '')
                                : 'Sin registros'}
                        </div>
                    </div>

                    <div className="card animate-scale-in" style={{ padding: '16px', animationDelay: '0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--color-success)', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                            <Baby size={14} /> Último Pañal
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                            {latestDiaper
                                ? formatDistanceToNow(new Date(latestDiaper.created_at), { locale: es, addSuffix: true })
                                : '—'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: '3px' }}>
                            {latestDiaper
                                ? (latestDiaper.status === 'wet' ? 'Mojado' : 'Sucio')
                                : 'Sin registros'}
                        </div>
                    </div>

                    <div className="card animate-scale-in" style={{ padding: '16px', gridColumn: 'span 2', animationDelay: '0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--color-secondary-dark)', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                            <Moon size={14} /> Último Sueño
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                            {latestSleep ? latestSleep.duration : '—'}
                        </div>
                        {latestSleep && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: '3px' }}>
                                {formatDistanceToNow(new Date(latestSleep.created_at), { locale: es, addSuffix: true })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add another baby button */}
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '18px',
                        border: '2px dashed var(--color-border)',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        color: 'var(--color-text-light)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        transition: 'all 0.25s ease',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-dark)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,134,159,0.06)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-light)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                >
                    <PlusCircle size={22} />
                    {isParentMother
                        ? '¿Eres mamá de más hijos? Agregar bebé'
                        : '¿Eres papá de más hijos? Agregar bebé'}
                </button>
            </div>
        </>
    );
}
