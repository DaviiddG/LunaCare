import { useState, useEffect } from 'react';
import { Baby } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
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
            <h2 style={{ marginBottom: '20px' }}>Registro de Pañales</h2>

            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--color-success)' }}>¿Cómo estaba el pañal?</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    <button
                        className={`button-secondary ${status === 'wet' ? 'active' : ''}`}
                        onClick={() => setStatus('wet')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            border: status === 'wet' ? '2px solid var(--color-secondary)' : '1px solid #f0f0f0'
                        }}
                    >
                        <div style={{ width: '24px', height: '24px', borderRadius: '12px', backgroundColor: 'var(--color-secondary)' }}></div>
                        <span>Mojado</span>
                    </button>
                    <button
                        className={`button-secondary ${status === 'dirty' ? 'active' : ''}`}
                        onClick={() => setStatus('dirty')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            border: status === 'dirty' ? '2px solid #dca060' : '1px solid #f0f0f0'
                        }}
                    >
                        <div style={{ width: '24px', height: '24px', borderRadius: '12px', backgroundColor: '#dca060' }}></div>
                        <span>Sucio</span>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontWeight: 500 }}>Observaciones (Color, consistencia)</label>
                    <textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Normal, un poco líquido..."
                        style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #ccc',
                            fontFamily: 'inherit',
                            minHeight: '80px'
                        }}
                    />

                    <button
                        className="button-primary"
                        style={{ marginTop: '15px', backgroundColor: 'var(--color-success)' }}
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar Registro'}
                    </button>
                </div>
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
                                <Baby size={20} color={item.status === 'wet' ? 'var(--color-secondary)' : '#dca060'} />
                                <span>{item.status === 'wet' ? 'Mojado' : 'Sucio'}</span>
                            </div>
                            <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

