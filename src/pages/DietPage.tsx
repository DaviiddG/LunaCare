import { useState, useEffect } from 'react';
import { Droplet, Milk, Utensils } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
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
            <h2 style={{ marginBottom: '20px' }}>Registro de Alimentación</h2>

            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--color-primary-dark)' }}>¿Qué comió el bebé?</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    <button
                        className={`button-secondary ${type === 'breast' ? 'active' : ''}`}
                        onClick={() => setType('breast')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            border: type === 'breast' ? '2px solid var(--color-primary)' : '1px solid #f0f0f0'
                        }}
                    >
                        <Droplet size={24} color="var(--color-primary)" />
                        <span>Pecho</span>
                    </button>
                    <button
                        className={`button-secondary ${type === 'formula' ? 'active' : ''}`}
                        onClick={() => setType('formula')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            border: type === 'formula' ? '2px solid var(--color-secondary-dark)' : '1px solid #f0f0f0'
                        }}
                    >
                        <Milk size={24} color="var(--color-secondary-dark)" />
                        <span>Fórmula</span>
                    </button>
                    <button
                        className={`button-secondary ${type === 'solids' ? 'active' : ''}`}
                        onClick={() => setType('solids')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            border: type === 'solids' ? '2px solid var(--color-warning)' : '1px solid #f0f0f0'
                        }}
                    >
                        <Utensils size={24} color="var(--color-warning)" />
                        <span>Sólidos</span>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontWeight: 500 }}>Cantidad (ml o gramos)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Ej. 120"
                        style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #ccc',
                            fontFamily: 'inherit'
                        }}
                    />

                    <label style={{ fontWeight: 500, marginTop: '10px' }}>Observaciones</label>
                    <textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="¿Cómo lo toleró? etc."
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
                        style={{ marginTop: '15px' }}
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
                                {item.type === 'formula' && <Milk size={20} color="var(--color-secondary-dark)" />}
                                {item.type === 'breast' && <Droplet size={20} color="var(--color-primary)" />}
                                {item.type === 'solids' && <Utensils size={20} color="var(--color-warning)" />}
                                <span>{item.type.charAt(0).toUpperCase() + item.type.slice(1)} - {item.amount} {item.type === 'solids' ? 'g' : 'ml'}</span>
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

