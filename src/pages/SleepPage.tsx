import { useState, useEffect } from 'react';
import { Moon, Sun, Clock, Sparkles } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function SleepPage() {
    const { user } = useAuth();
    const [isSleeping, setIsSleeping] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        fetchHistory();
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
            const now = new Date();
            setStartTime(now);
            setIsSleeping(true);
            localStorage.setItem('sleep_start', now.toISOString());
        } else {
            setLoading(true);
            const endTime = new Date();
            const start = startTime || new Date();

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
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Sueño</h2>
                <p style={{ color: 'var(--color-text-light)', margin: 0 }}>Monitorea los descansos de tu bebé.</p>
            </div>

            <div className="card" style={{
                marginBottom: '30px',
                textAlign: 'center',
                borderTop: `4px solid ${isSleeping ? 'var(--color-secondary-dark)' : 'var(--color-warning)'}`,
                transition: 'all var(--transition-normal)'
            }}>
                <h3 style={{ marginBottom: '25px', fontSize: '1.25rem', fontWeight: 700 }}>
                    {isSleeping ? 'Shhh... Está durmiendo' : '¡Bebé despierto!'}
                </h3>

                <div className="flex-center" style={{ margin: '30px 0', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <div className="animate-pulse" style={{
                        width: '140px',
                        height: '140px',
                        borderRadius: '50%',
                        backgroundColor: isSleeping ? 'rgba(173, 216, 230, 0.1)' : 'rgba(251, 196, 171, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        transition: 'all 0.5s ease'
                    }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            backgroundColor: isSleeping ? 'var(--color-secondary-dark)' : 'var(--color-warning)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 0 40px ${isSleeping ? 'rgba(135,206,235,0.6)' : 'rgba(251,196,171,0.6)'}`,
                            zIndex: 2
                        }}>
                            {isSleeping ? <Moon size={50} color="white" /> : <Sun size={50} color="white" />}
                        </div>
                    </div>
                </div>


                {isSleeping && startTime && (
                    <div style={{
                        background: 'var(--color-bg)',
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-full)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px'
                    }}>
                        <Clock size={16} color="var(--color-secondary-dark)" />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            Desde las {format(startTime, 'HH:mm')}
                        </span>
                    </div>
                )}

                <div style={{ padding: '0 20px' }}>
                    <button
                        className="button-primary"
                        style={{
                            width: '100%',
                            fontSize: '1.1rem',
                            padding: '18px',
                            backgroundColor: isSleeping ? 'var(--color-warning)' : 'var(--color-secondary-dark)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            boxShadow: 'var(--shadow-md)'
                        }}
                        onClick={handleToggleSleep}
                        disabled={loading}
                    >
                        {loading ? '...' : (
                            <>
                                <Sparkles size={20} />
                                <span>{isSleeping ? '¡Se ha despertado!' : '¡A dormir!'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Últimos descansos</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>{history.length} registros</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {history.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Clock size={32} color="var(--color-text-light)" style={{ marginBottom: '10px', opacity: 0.5 }} />
                        <p style={{ color: 'var(--color-text-light)', margin: 0 }}>No hay registros de sueño aún.</p>
                    </div>
                ) : (
                    history.map((record, index) => (
                        <div key={record.id} className="card animate-fade-in" style={{
                            padding: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            animationDelay: `${index * 0.1}s`
                        }}>
                            <div style={{
                                width: '45px',
                                height: '45px',
                                borderRadius: '12px',
                                background: 'var(--color-secondary-dark)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Moon size={20} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                                        Descanso de {record.duration}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                                        {formatDistanceToNow(new Date(record.created_at), { addSuffix: true, locale: es })}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
                                    {format(new Date(record.start_time), 'HH:mm')} - {format(new Date(record.end_time), 'HH:mm')}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}


