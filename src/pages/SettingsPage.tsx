import { useState, useEffect } from 'react';
import { User, Baby, Ruler, Weight, Calendar, Save, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function SettingsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [babyData, setBabyData] = useState({
        name: '',
        birth_date: '',
        weight: '',
        height: '',
        gender: ''
    });

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        setIsLoading(true);
        const { data } = await dbHelpers.getBabyProfile(user!.id);
        if (data) {
            setBabyData({
                name: data.name || '',
                birth_date: data.birth_date || '',
                weight: data.weight?.toString() || '',
                height: data.height?.toString() || '',
                gender: data.gender || ''
            });
        }
        setIsLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        setMessage(null);

        const { error } = await dbHelpers.upsertBabyProfile({
            user_id: user.id,
            name: babyData.name,
            birth_date: babyData.birth_date,
            weight: parseFloat(babyData.weight) || 0,
            height: parseFloat(babyData.height) || 0,
            gender: babyData.gender
        });

        if (error) {
            setMessage({ type: 'error', text: 'Error al ahorrar: ' + error.message });
        } else {
            setMessage({ type: 'success', text: '┬íPerfil actualizado con ├⌐xito! Γ£¿' });
        }
        setIsSaving(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    if (isLoading) return <div className="flex-center" style={{ minHeight: '60vh' }}>Cargando datos m├ígicos... Γ£¿</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Perfil del Beb├⌐</h2>
                    <p style={{ color: 'var(--color-text-light)', margin: 0 }}>Completa la informaci├│n para que Luna te ayude mejor.</p>
                </div>
            </div>

            {message && (
                <div className="animate-fade-in" style={{
                    backgroundColor: message.type === 'success' ? 'rgba(181, 228, 140, 0.2)' : 'rgba(254, 226, 226, 0.9)',
                    color: message.type === 'success' ? '#4d7c0f' : '#b91c1c',
                    padding: '15px',
                    borderRadius: '16px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontWeight: 600,
                    border: `1px solid ${message.type === 'success' ? '#b5e48c' : '#fecaca'}`
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-dark)' }}>
                        <Baby size={24} style={{ margin: '0 auto' }} />
                    </div>

                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', display: 'block' }}>Nombre del Beb├⌐</label>
                        <input
                            type="text"
                            value={babyData.name}
                            onChange={e => setBabyData({ ...babyData, name: e.target.value })}
                            style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                outline: 'none',
                                color: 'var(--color-text)'
                            }}
                            placeholder="Ej. Luna"
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="auth-input-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14} /> F. Nacimiento</label>
                        <input
                            type="date"
                            className="auth-input"
                            style={{ paddingLeft: '15px' }}
                            value={babyData.birth_date}
                            onChange={e => setBabyData({ ...babyData, birth_date: e.target.value })}
                        />
                    </div>
                    <div className="auth-input-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={14} /> G├⌐nero</label>
                        <select
                            className="auth-input"
                            style={{ paddingLeft: '15px' }}
                            value={babyData.gender}
                            onChange={e => setBabyData({ ...babyData, gender: e.target.value })}
                        >
                            <option value="">Seleccionar...</option>
                            <option value="ni├▒o">Ni├▒o</option>
                            <option value="ni├▒a">Ni├▒a</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="auth-input-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Weight size={14} /> Peso (kg)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="auth-input"
                            style={{ paddingLeft: '15px' }}
                            value={babyData.weight}
                            onChange={e => setBabyData({ ...babyData, weight: e.target.value })}
                            placeholder="3.5"
                        />
                    </div>
                    <div className="auth-input-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Ruler size={14} /> Altura (cm)</label>
                        <input
                            type="number"
                            step="0.1"
                            className="auth-input"
                            style={{ paddingLeft: '15px' }}
                            value={babyData.height}
                            onChange={e => setBabyData({ ...babyData, height: e.target.value })}
                            placeholder="50"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="button-primary"
                    disabled={isSaving}
                    style={{
                        marginTop: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '16px'
                    }}
                >
                    <Save size={20} />
                    <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
            </form>

            <div style={{ marginTop: '30px' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        padding: '15px',
                        borderRadius: '16px',
                        border: '1px solid var(--color-border)',
                        color: '#EF4444',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        background: 'rgba(239, 68, 68, 0.05)'
                    }}
                >
                    <LogOut size={20} />
                    Cerrar Sesi├│n Segura
                </button>
            </div>
        </div>
    );
}
