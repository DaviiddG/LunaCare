import { useState, useEffect } from 'react';
import { Droplets, Trash2, Clock, Sparkles } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

export function DiapersPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState('wet');
    const [observations, setObservations] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const { data } = await dbHelpers.getDiapers();
        if (data) setHistory(data);
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        const { error } = await dbHelpers.insertDiaper({
            status,
            observations,
            user_id: user.id
        });

        if (!error) {
            setObservations('');
            fetchHistory();
        } else {
            alert('Error al guardar: ' + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Pañales</h2>
                <p style={{ color: 'var(--color-text-light)', margin: 0 }}>Lleva el control de los cambios diarios.</p>
            </div>

            <div className="card" style={{ marginBottom: '30px', borderTop: '4px solid var(--color-success)' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Nuevo cambio</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                    <button
                        className={`button-secondary flex-center ${status === 'wet' ? 'active' : ''}`}
                        onClick={() => setStatus('wet')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '20px 10px',
                            minHeight: '110px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '12px',
                            background: status === 'wet' ? 'var(--color-secondary)' : 'var(--color-surface)'
                        }}
                    >
                        <Droplets size={32} color={status === 'wet' ? 'white' : 'var(--color-secondary-dark)'} />
                        <span style={{ fontSize: '1rem', fontWeight: 600 }}>Mojado</span>
                    </button>
                    <button
                        className={`button-secondary flex-center ${status === 'dirty' ? 'active' : ''}`}
                        onClick={() => setStatus('dirty')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '20px 10px',
                            minHeight: '110px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '12px',
                            background: status === 'dirty' ? '#dca060' : 'var(--color-surface)'
                        }}
                    >
                        <Trash2 size={32} color={status === 'dirty' ? 'white' : '#dca060'} />
                        <span style={{ fontSize: '1rem', fontWeight: 600 }}>Sucio</span>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notas adicionales</label>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="Color, consistencia o notas..."
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg)',
                                color: 'var(--color-text)',
                                minHeight: '80px',
                                fontFamily: 'inherit',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>

                    <button
                        className="button-primary"
                        style={{
                            width: '100%',
                            padding: '16px',
                            marginTop: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            backgroundColor: 'var(--color-success)'
                        }}
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : (
                            <>
                                <Sparkles size={18} />
                                <span>Registrar Cambio</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Historial</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>{history.length} cambios</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {history.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Clock size={32} color="var(--color-text-light)" style={{ marginBottom: '10px', opacity: 0.5 }} />
                        <p style={{ color: 'var(--color-text-light)', margin: 0 }}>Aún no hay registros de pañales.</p>
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
                                background: record.status === 'wet' ? 'var(--color-secondary)' : '#dca060',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {record.status === 'wet' ? <Droplets size={20} color="white" /> : <Trash2 size={20} color="white" />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                                    Pañal {record.status === 'wet' ? 'Mojado' : 'Sucio'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: '2px' }}>
                                    {format(new Date(record.created_at), 'HH:mm')} • {formatDistanceToNow(new Date(record.created_at), { addSuffix: true, locale: es })}
                                </div>
                                {record.observations && (
                                    <div style={{ fontSize: '0.85rem', marginTop: '5px', fontStyle: 'italic', color: 'var(--color-text)' }}>
                                        "{record.observations}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

