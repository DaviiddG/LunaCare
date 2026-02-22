import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Clock, Play, Square } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBabies } from '../hooks/useBabies';
import { BabySelector } from '../components/BabySelector';

function useTimer(startTime: Date | null) {
    const [elapsed, setElapsed] = useState('00:00:00');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (startTime) {
            const update = () => {
                const diff = Date.now() - startTime.getTime();
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
            };
            update();
            intervalRef.current = setInterval(update, 1000);
        } else {
            setElapsed('00:00:00');
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [startTime]);

    return elapsed;
}

export function SleepPage() {
    const { user } = useAuth();
    const { babies, selectedBaby, setSelectedBaby } = useBabies();
    const [isSleeping, setIsSleeping] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const elapsed = useTimer(startTime);

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
            }
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '6px', fontWeight: 800 }}>Sueño</h2>
                <p style={{ color: 'var(--color-text-light)', margin: 0, fontSize: '0.95rem' }}>
                    {selectedBaby && babies.length > 1
                        ? `Monitoreando el descanso de ${selectedBaby.name}`
                        : 'Monitorea los descansos de tu bebé.'}
                </p>
            </div>

            <BabySelector babies={babies} selectedBaby={selectedBaby} onSelect={setSelectedBaby} />

            <div className="card" style={{
                marginBottom: '28px',
                textAlign: 'center',
                padding: '30px 20px',
                borderTop: `4px solid ${isSleeping ? 'var(--color-secondary-dark)' : 'var(--color-warning)'}`,
                transition: 'border-color 0.6s ease',
                overflow: 'hidden',
                position: 'relative'
            }}>
                {/* Subtle radial gradient background */}
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: 'inherit',
                    background: isSleeping
                        ? 'radial-gradient(circle at 50% 40%, rgba(135,206,235,0.07) 0%, transparent 70%)'
                        : 'radial-gradient(circle at 50% 40%, rgba(251,196,171,0.07) 0%, transparent 70%)',
                    transition: 'background 0.6s ease', pointerEvents: 'none'
                }} />

                <h3 style={{ marginBottom: '8px', fontSize: '1.2rem', fontWeight: 700, position: 'relative' }}>
                    {isSleeping ? 'Shhh... Está durmiendo 😴' : '¡Bebé despierto! ☀️'}
                </h3>

                {/* Orb with pulse rings */}
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', margin: '28px 0' }}>
                    {isSleeping && (
                        <>
                            <div className="sleep-ring ring-1" style={{
                                position: 'absolute', width: '180px', height: '180px',
                                borderRadius: '50%', border: '2px solid rgba(135,206,235,0.3)',
                                top: '50%', left: '50%', transform: 'translate(-50%,-50%)'
                            }} />
                            <div className="sleep-ring ring-2" style={{
                                position: 'absolute', width: '210px', height: '210px',
                                borderRadius: '50%', border: '2px solid rgba(135,206,235,0.15)',
                                top: '50%', left: '50%', transform: 'translate(-50%,-50%)'
                            }} />
                        </>
                    )}
                    <div style={{
                        width: '130px', height: '130px', borderRadius: '50%',
                        background: isSleeping
                            ? 'linear-gradient(135deg, #5bb8d4, #38bdf8)'
                            : 'linear-gradient(135deg, #f9a46a, #f97316)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isSleeping
                            ? '0 0 50px rgba(91,184,212,0.5), 0 0 20px rgba(91,184,212,0.3)'
                            : '0 0 50px rgba(249,164,106,0.5), 0 0 20px rgba(249,164,106,0.3)',
                        transition: 'all 0.6s ease',
                        position: 'relative', zIndex: 2
                    }}>
                        {isSleeping
                            ? <Moon size={56} color="white" />
                            : <Sun size={56} color="white" style={{ animation: 'spin 8s linear infinite' }} />
                        }
                    </div>
                </div>

                {/* Live timer */}
                {isSleeping && (
                    <div className="animate-fade-in" style={{ marginBottom: '20px' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '10px',
                            background: 'var(--color-bg)',
                            padding: '10px 24px', borderRadius: '50px',
                            fontSize: '1.6rem', fontWeight: 800,
                            fontFamily: 'monospace, monospace',
                            letterSpacing: '0.05em',
                            color: 'var(--color-secondary-dark)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <Clock size={20} style={{ flexShrink: 0 }} />
                            {elapsed}
                        </div>
                        {startTime && (
                            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                                Desde las {format(startTime, 'HH:mm')}
                            </div>
                        )}
                    </div>
                )}

                {/* Toggle button */}
                <button
                    onClick={handleToggleSleep}
                    disabled={loading}
                    className="sleep-toggle-btn"
                    style={{
                        width: '100%',
                        padding: '18px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        background: isSleeping
                            ? 'linear-gradient(135deg, #f9a46a, #f97316)'
                            : 'linear-gradient(135deg, #5bb8d4, #38bdf8)',
                        color: 'white',
                        boxShadow: isSleeping
                            ? '0 8px 25px rgba(249,164,106,0.4)'
                            : '0 8px 25px rgba(91,184,212,0.4)',
                        border: 'none',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? (
                        <span>Guardando...</span>
                    ) : isSleeping ? (
                        <><Square size={20} fill="white" /> ¡Se ha despertado!</>
                    ) : (
                        <><Play size={20} fill="white" /> ¡A dormir!</>
                    )}
                </button>
            </div>

            {/* History */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Últimos descansos</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-light)', background: 'var(--color-surface)', padding: '4px 10px', borderRadius: '20px' }}>
                    {history.length} registros
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Moon size={36} color="var(--color-text-light)" style={{ marginBottom: '12px', opacity: 0.4 }} />
                        <p style={{ color: 'var(--color-text-light)', margin: 0 }}>No hay registros de sueño aún.</p>
                    </div>
                ) : (
                    history.map((record, index) => (
                        <div key={record.id} className="card animate-fade-in" style={{
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            animationDelay: `${index * 0.07}s`,
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '14px',
                                background: 'linear-gradient(135deg, #5bb8d4, #38bdf8)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 4px 12px rgba(91,184,212,0.3)'
                            }}>
                                <Moon size={20} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                                        Descanso de <span style={{ color: 'var(--color-secondary-dark)' }}>{record.duration}</span>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', flexShrink: 0, marginLeft: '8px' }}>
                                        {formatDistanceToNow(new Date(record.created_at), { addSuffix: true, locale: es })}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.83rem', color: 'var(--color-text-light)', marginTop: '3px' }}>
                                    {format(new Date(record.start_time), 'HH:mm')} → {format(new Date(record.end_time), 'HH:mm')}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
