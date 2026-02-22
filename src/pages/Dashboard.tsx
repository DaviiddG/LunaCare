import { useEffect, useState } from 'react';
import { Activity, Baby, Moon, Droplet } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { BabyProfileModal } from '../components/BabyProfileModal';

export function Dashboard() {
    const { user } = useAuth();
    const [latestDiet, setLatestDiet] = useState<any>(null);
    const [latestDiaper, setLatestDiaper] = useState<any>(null);
    const [totalSleep, setTotalSleep] = useState('0h 0m');
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [babyName, setBabyName] = useState('');

    useEffect(() => {
        if (user) fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        setIsLoading(true);

        // Check baby profile first
        const { data: baby } = await dbHelpers.getBabyProfile(user!.id);
        if (!baby) {
            setShowModal(true);
        } else {
            setBabyName(baby.name || '');
        }

        const { data: diets } = await dbHelpers.getDiets();
        const { data: diapers } = await dbHelpers.getDiapers();
        const { data: sleep } = await dbHelpers.getSleepLogs();

        if (diets && diets.length > 0) setLatestDiet(diets[0]);
        if (diapers && diapers.length > 0) setLatestDiaper(diapers[0]);
        if (sleep && sleep.length > 0) setTotalSleep(sleep[0].duration || '0h 0m');

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
            setBabyName(profileData.name || '');
            setShowModal(false);
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
                <p style={{ color: 'var(--color-text-light)' }}>Cargando resumen...</p>
            </div>
        );
    }

    return (
        <>
            {showModal && (
                <BabyProfileModal onSave={handleModalSave} />
            )}

            <div className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                    <div style={{
                        width: '54px', height: '54px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem', boxShadow: '0 4px 15px rgba(232,134,159,0.4)'
                    }}>
                        🍼
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>¡Hola, {babyName ? `mamá de ${babyName}` : 'Mamá'}!</h2>
                        <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Resumen de hoy</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div className="card animate-scale-in" style={{ padding: '18px', animationDelay: '0.05s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary-dark)', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Droplet size={15} /> Última Comida
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>
                            {latestDiet ? formatDistanceToNow(new Date(latestDiet.created_at), { locale: es }) : '—'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
                            {latestDiet ? `${latestDiet.type === 'breast' ? 'Pecho' : latestDiet.type === 'formula' ? 'Fórmula' : 'Sólidos'}${latestDiet.amount ? ` ${latestDiet.amount}ml` : ''}` : 'No hay datos'}
                        </div>
                    </div>
                    <div className="card animate-scale-in" style={{ padding: '18px', animationDelay: '0.1s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Baby size={15} /> Último Pañal
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>
                            {latestDiaper ? formatDistanceToNow(new Date(latestDiaper.created_at), { locale: es }) : '—'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
                            {latestDiaper ? (latestDiaper.status === 'wet' ? 'Mojado' : 'Sucio') : 'No hay datos'}
                        </div>
                    </div>
                    <div className="card animate-scale-in" style={{ padding: '18px', gridColumn: 'span 2', animationDelay: '0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-secondary-dark)', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                            <Moon size={15} /> Último Sueño
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.6rem' }}>{totalSleep}</div>
                    </div>
                </div>

                <div className="card animate-scale-in" style={{ animationDelay: '0.2s' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <Activity color="var(--color-warning)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <div style={{ fontWeight: 700 }}>Mantente atenta</div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                                Registra cada actividad para llevar un historial completo de tu bebé.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
