import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function SleepPage() {
    const { user } = useAuth();
    const [isSleeping, setIsSleeping] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        fetchHistory();
        // Cargar estado si estaba durmiendo (esto se podría persistir en localstorage o DB)
        const savedStart = localStorage.getItem('sleep_start');
        if (savedStart) {
            setStartTime(new Date(savedStart));
            setIsSleeping(true);
        }
    }, []);

    const fetchHistory = async () => {
        const { data } = await dbHelpers.getSleepLogs();
        if (data) setHistory(data);
    };

    const handleToggleSleep = async () => {
        if (!user) return;

        if (!isSleeping) {
            // Empezar a dormir
            const now = new Date();
            setStartTime(now);
            setIsSleeping(true);
            localStorage.setItem('sleep_start', now.toISOString());
        } else {
            // Despertar
            setLoading(true);
            const endTime = new Date();
            const start = startTime || new Date();

            // Calcular duración legible
            const diffMs = endTime.getTime() - start.getTime();
            const diffMins = Math.round(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            const durationStr = `${hours}h ${mins}m`;

            const { error } = await dbHelpers.insertSleepLog({
                start_time: start.toISOString(),
                end_time: endTime.toISOString(),
                duration: durationStr,
                user_id: user.id
            });

            if (!error) {
                setIsSleeping(false);
                setStartTime(null);
                localStorage.removeItem('sleep_start');
                fetchHistory();
            } else {
                alert('Error al guardar: ' + error.message);
            }
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <h2 style={{ marginBottom: '20px' }}>Registro de Sueño</h2>

            <div className="card" style={{ marginBottom: '20px', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--color-secondary-dark)' }}>
                    {isSleeping ? 'El bebé está durmiendo' : 'El bebé está despierto'}
                </h3>

                {isSleeping && startTime && (
                    <p style={{ color: 'var(--color-text-light)', marginBottom: '10px' }}>
                        Durmiendo desde: {format(startTime, 'p', { locale: es })}
                    </p>
                )}

                <div style={{ margin: '20px 0' }}>
                    {isSleeping ? (
                        <div className="animate-fade-in" style={{ display: 'inline-block', padding: '20px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)' }}>
                            <Moon size={64} color="white" />
                        </div>
                    ) : (
                        <div className="animate-fade-in" style={{ display: 'inline-block', padding: '20px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }}>
                            <Sun size={64} color="white" />
                        </div>
                    )}
                </div>

                <button
                    className="button-primary"
                    style={{
                        fontSize: '1.2rem',
                        padding: '16px 32px',
                        backgroundColor: isSleeping ? 'var(--color-warning)' : 'var(--color-secondary-dark)'
                    }}
                    onClick={handleToggleSleep}
                    disabled={loading}
                >
                    {loading ? 'Procesando...' : (isSleeping ? 'Despertar al bebé' : 'Empezar a dormir')}
                </button>
            </div>

            <h3 style={{ marginBottom: '15px' }}>Registros Recientes</h3>
            <div className="card">
                {history.length === 0 ? (
                    <p style={{ color: 'var(--color-text-light)', textAlign: 'center' }}>No hay registros aún.</p>
                ) : (
                    history.map((item, index) => (
                        <div key={item.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            borderBottom: index !== history.length - 1 ? '1px solid #eee' : 'none',
                            paddingBottom: '10px',
                            marginBottom: '10px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Moon size={20} color="var(--color-secondary-dark)" />
                                <span>Sueño</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold' }}>{item.duration}</div>
                                <div style={{ color: 'var(--color-text-light)', fontSize: '0.8rem' }}>
                                    {format(new Date(item.start_time), 'HH:mm')} - {format(new Date(item.end_time), 'HH:mm')}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

