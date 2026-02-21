import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { AiAdvisor } from '../components/AiAdvisor';
import { dbHelpers } from '../lib/db';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function Dashboard() {
    const [latestDiet, setLatestDiet] = useState<any>(null);
    const [latestDiaper, setLatestDiaper] = useState<any>(null);
    const [totalSleep, setTotalSleep] = useState('0h 0m');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);

            // Fetch records
            const { data: diets } = await dbHelpers.getDiets();
            const { data: diapers } = await dbHelpers.getDiapers();
            const { data: sleep } = await dbHelpers.getSleepLogs();

            if (diets && diets.length > 0) setLatestDiet(diets[0]);
            if (diapers && diapers.length > 0) setLatestDiaper(diapers[0]);

            // Summary sleep today (very simple naive calculation for demo)
            if (sleep && sleep.length > 0) {
                // For a real app we'd filter for "today", but let's just show the last duration recorded
                setTotalSleep(sleep[0].duration || '0h 0m');
            }

            setIsLoading(false);
        };

        fetchDashboardData();
    }, []);

    const feedingSummary = latestDiet
        ? `${formatDistanceToNow(new Date(latestDiet.created_at), { addSuffix: true, locale: es })} (${latestDiet.type === 'breast' ? 'Pecho' : latestDiet.type === 'formula' ? 'Fórmula' : 'Sólidos'}${latestDiet.amount ? ` ${latestDiet.amount}ml` : ''})`
        : 'Sin registros';

    const diaperSummary = latestDiaper
        ? `${formatDistanceToNow(new Date(latestDiaper.created_at), { addSuffix: true, locale: es })} (${latestDiaper.status === 'wet' ? 'Mojado' : 'Sucio'})`
        : 'Sin registros';

    if (isLoading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando resumen...</div>;
    }

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '25px',
                    backgroundColor: 'var(--color-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                }}>
                    👶
                </div>
                <div>
                    <h2 style={{ margin: 0 }}>¡Hola, Mamá!</h2>
                    <p style={{ margin: 0, color: 'var(--color-text-light)' }}>Resumen de hoy</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="card" style={{ padding: '15px' }}>
                    <div style={{ color: 'var(--color-primary-dark)', marginBottom: '5px' }}>Última Comida</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                        {latestDiet ? formatDistanceToNow(new Date(latestDiet.created_at), { locale: es }) : '-'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                        {latestDiet ? `${latestDiet.type === 'breast' ? 'Pecho' : latestDiet.type === 'formula' ? 'Fórmula' : 'Sólidos'}${latestDiet.amount ? ` ${latestDiet.amount}ml` : ''}` : 'No hay datos'}
                    </div>
                </div>
                <div className="card" style={{ padding: '15px' }}>
                    <div style={{ color: 'var(--color-success)', marginBottom: '5px' }}>Último Pañal</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                        {latestDiaper ? formatDistanceToNow(new Date(latestDiaper.created_at), { locale: es }) : '-'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                        {latestDiaper ? (latestDiaper.status === 'wet' ? 'Mojado' : 'Sucio') : 'No hay datos'}
                    </div>
                </div>
                <div className="card" style={{ padding: '15px', gridColumn: 'span 2' }}>
                    <div style={{ color: 'var(--color-secondary-dark)', marginBottom: '5px' }}>Último Sueño (Registrado)</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{totalSleep}</div>
                </div>
            </div>

            <h3 style={{ marginBottom: '15px' }}>Recordatorio</h3>
            <div className="card">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <Activity color="var(--color-warning)" style={{ marginTop: '2px' }} />
                    <div>
                        <div style={{ fontWeight: 'bold' }}>Mantente atenta</div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                            Recuerda registrar cada actividad para obtener mejores consejos de la IA.
                        </p>
                    </div>
                </div>
            </div>

            <AiAdvisor
                lastFeeding={feedingSummary}
                lastDiaper={diaperSummary}
                sleepTime={totalSleep}
            />
        </div>
    );
}
