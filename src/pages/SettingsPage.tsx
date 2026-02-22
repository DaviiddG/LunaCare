import { useState, useEffect } from 'react';
import { Baby, Ruler, Weight, Calendar, Save, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';

const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

export function SettingsPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [role, setRole] = useState<string>((user?.user_metadata?.role as string) || '');

    const [babyData, setBabyData] = useState({
        name: '',
        birth_date: '',
        weight: '',
        height: '',
        gender: ''
    });

    useEffect(() => {
        if (user) fetchProfile();
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

        // Save role to user metadata
        if (role) {
            await supabase.auth.updateUser({ data: { role } });
        }

        const { error } = await dbHelpers.upsertBabyProfile({
            user_id: user.id,
            name: babyData.name,
            birth_date: babyData.birth_date,
            weight: parseFloat(babyData.weight) || 0,
            height: parseFloat(babyData.height) || 0,
            gender: babyData.gender
        });

        if (error) {
            setMessage({ type: 'error', text: 'Error al guardar: ' + error.message });
        } else {
            setMessage({ type: 'success', text: '¡Perfil actualizado con éxito! ✅' });
        }
        setIsSaving(false);
    };

    if (isLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <p style={{ color: 'var(--color-text-light)' }}>Cargando perfil...</p>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '6px', fontWeight: 800 }}>Perfil del Bebé</h2>
                <p style={{ color: 'var(--color-text-light)', margin: 0, fontSize: '0.95rem' }}>
                    Actualiza la información de tu bebé.
                </p>
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
                {/* Role selector */}
                <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', display: 'block', marginBottom: '10px' }}>Soy...</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {[{ val: 'madre', emoji: '🤱', label: 'Mamá' }, { val: 'padre', emoji: '👨‍🍼', label: 'Papá' }].map(opt => (
                            <button key={opt.val} type="button" onClick={() => setRole(opt.val)}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '14px',
                                    border: `2px solid ${role === opt.val ? 'var(--color-primary-dark)' : 'var(--color-border)'}`,
                                    background: role === opt.val ? 'rgba(232,134,159,0.1)' : 'transparent',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    fontWeight: 700, fontSize: '0.9rem',
                                    color: role === opt.val ? 'var(--color-primary-dark)' : 'var(--color-text)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}>
                                <span style={{ fontSize: '1.3rem' }}>{opt.emoji}</span>{opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Nombre del bebé */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-dark)', flexShrink: 0 }}>
                        <Baby size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', display: 'block', marginBottom: '4px' }}>Nombre del Bebé</label>
                        <input
                            type="text"
                            value={babyData.name}
                            onChange={e => setBabyData({ ...babyData, name: e.target.value })}
                            style={{
                                width: '100%', border: 'none', background: 'transparent',
                                fontSize: '1.2rem', fontWeight: 700, outline: 'none',
                                color: 'var(--color-text)'
                            }}
                            placeholder="Ej. Sofía"
                            required
                        />
                    </div>
                </div>

                {/* Fecha y Género */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="auth-input-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} /> F. Nacimiento
                        </label>
                        <input
                            type="date"
                            className="auth-input"
                            style={{ paddingLeft: '15px' }}
                            max={today}
                            value={babyData.birth_date}
                            onChange={e => setBabyData({ ...babyData, birth_date: e.target.value })}
                        />
                    </div>
                    <div className="auth-input-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={14} /> Género
                        </label>
                        <select
                            className="auth-input"
                            style={{ paddingLeft: '15px' }}
                            value={babyData.gender}
                            onChange={e => setBabyData({ ...babyData, gender: e.target.value })}
                        >
                            <option value="">Seleccionar...</option>
                            <option value="niña">Niña</option>
                            <option value="niño">Niño</option>
                        </select>
                    </div>
                </div>

                {/* Peso y Altura */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="auth-input-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Weight size={14} /> Peso (kg)
                        </label>
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Ruler size={14} /> Altura (cm)
                        </label>
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
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '10px', padding: '16px'
                    }}
                >
                    <Save size={20} />
                    <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
            </form>
        </div>
    );
}
