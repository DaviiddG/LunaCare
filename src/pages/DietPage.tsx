import { useState, useEffect } from 'react';
import { Droplet, Milk, Utensils, Clock, Sparkles } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

export function DietPage() {
    const { user } = useAuth();
    const [type, setType] = useState('breast');
    const [amount, setAmount] = useState('');
    const [observations, setObservations] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const { data } = await dbHelpers.getDiets();
        if (data) setHistory(data);
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        const { error } = await dbHelpers.insertDiet({
            type,
            amount: Number(amount),
            observations,
            user_id: user.id
        });

        if (!error) {
            setAmount('');
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
                <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Alimentación</h2>
                <p style={{ color: 'var(--color-text-light)', margin: 0 }}>Registra qué y cuánto ha comido el bebé hoy.</p>
            </div>

            <div className="card" style={{ marginBottom: '30px', borderTop: '4px solid var(--color-primary)' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Siguiente toma</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '25px' }}>
                    <button
                        className={`button-secondary flex-center ${type === 'breast' ? 'active' : ''}`}
                        onClick={() => setType('breast')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '15px 10px',
                            minHeight: '100px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        <Droplet size={28} color={type === 'breast' ? 'white' : 'var(--color-primary)'} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Pecho</span>
                    </button>
                    <button
                        className={`button-secondary flex-center ${type === 'formula' ? 'active' : ''}`}
                        onClick={() => setType('formula')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '15px 10px',
                            minHeight: '100px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        <Milk size={28} color={type === 'formula' ? 'white' : 'var(--color-secondary-dark)'} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Fórmula</span>
                    </button>
                    <button
                        className={`button-secondary flex-center ${type === 'solids' ? 'active' : ''}`}
                        onClick={() => setType('solids')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '15px 10px',
                            minHeight: '100px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        <Utensils size={28} color={type === 'solids' ? 'white' : 'var(--color-success)'} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sólidos</span>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Cantidad (ml/gr)</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg)',
                                    color: 'var(--color-text)',
                                    fontSize: '1rem'
                                }}
                            />
                            {amount && (
                                <span style={{ position: 'absolute', right: '16px', top: '14px', color: 'var(--color-text-light)' }}>
                                    {type === 'solids' ? 'gr' : 'ml'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Observaciones</label>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="¿Alguna reacción o nota especial?"
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
                            gap: '10px'
                        }}
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : (
                            <>
                                <Sparkles size={18} />
                                <span>Registrar Toma</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Historial del día</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>{history.length} tomas</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {history.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Clock size={32} color="var(--color-text-light)" style={{ marginBottom: '10px', opacity: 0.5 }} />
                        <p style={{ color: 'var(--color-text-light)', margin: 0 }}>Aún no has registrado nada hoy.</p>
                    </div>
                ) : (
                    history.map((record, index) => (
                        <div key={record.id} className="card animate-fade-in" style={{
                            padding: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            animationDelay: `${index * 0.1} s`
                        }}>
                            <div style={{
                                width: '45px',
                                height: '45px',
                                borderRadius: '12px',
                                background: record.type === 'breast' ? 'var(--color-primary)' :
                                    record.type === 'formula' ? 'var(--color-secondary-dark)' : 'var(--color-success)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {record.type === 'breast' ? <Droplet size={20} color="white" /> :
                                    record.type === 'formula' ? <Milk size={20} color="white" /> : <Utensils size={20} color="white" />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                                    {record.type === 'breast' ? 'Pecho' : record.type === 'formula' ? 'Fórmula' : 'Sólidos'}
                                    {record.amount > 0 && <span style={{ fontWeight: 500, color: 'var(--color-text-light)', marginLeft: '8px' }}>{record.amount}{record.type === 'solids' ? 'gr' : 'ml'}</span>}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: '2px' }}>
                                    {format(new Date(record.created_at), 'HH:mm')} ΓÇó {formatDistanceToNow(new Date(record.created_at), { addSuffix: true, locale: es })}
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
