import { useState, useEffect } from 'react';
import { Baby, Ruler, Weight, Calendar, Save, User, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';

const today = new Date().toISOString().split('T')[0];

type BabyForm = {
    id: string;
    name: string;
    birth_date: string;
    weight: string;
    height: string;
    gender: string;
    expanded: boolean;
    saving: boolean;
    saved: boolean;
};

export function SettingsPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [role, setRole] = useState<string>((user?.user_metadata?.role as string) || '');
    const [roleSaved, setRoleSaved] = useState(false);
    const [babies, setBabies] = useState<BabyForm[]>([]);

    useEffect(() => {
        if (user) fetchBabies();
    }, [user]);

    const fetchBabies = async () => {
        setIsLoading(true);
        const { data } = await dbHelpers.getAllBabyProfiles(user!.id);
        if (data) {
            setBabies(data.map((b: any, i: number) => ({
                id: b.id,
                name: b.name || '',
                birth_date: b.birth_date || '',
                weight: b.weight?.toString() || '',
                height: b.height?.toString() || '',
                gender: b.gender || '',
                expanded: i === 0, // first baby expanded by default
                saving: false,
                saved: false,
            })));
        }
        setIsLoading(false);
    };

    const updateBabyField = (id: string, field: string, value: string) => {
        setBabies(prev => prev.map(b => b.id === id ? { ...b, [field]: value, saved: false } : b));
    };

    const toggleExpand = (id: string) => {
        setBabies(prev => prev.map(b => b.id === id ? { ...b, expanded: !b.expanded } : b));
    };

    const saveBaby = async (baby: BabyForm) => {
        if (!user) return;
        setBabies(prev => prev.map(b => b.id === baby.id ? { ...b, saving: true } : b));

        const { error } = await dbHelpers.upsertBabyProfile({
            id: baby.id,
            user_id: user.id,
            name: baby.name,
            birth_date: baby.birth_date,
            weight: parseFloat(baby.weight) || 0,
            height: parseFloat(baby.height) || 0,
            gender: baby.gender,
        });

        setBabies(prev => prev.map(b =>
            b.id === baby.id ? { ...b, saving: false, saved: !error } : b
        ));
    };

    const saveRole = async () => {
        if (!role) return;
        await supabase.auth.updateUser({ data: { role } });
        setRoleSaved(true);
        setTimeout(() => setRoleSaved(false), 3000);
    };

    if (isLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <p style={{ color: 'var(--color-text-light)' }}>Cargando perfil...</p>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '4px', fontWeight: 800 }}>Ajustes</h2>
                <p style={{ color: 'var(--color-text-light)', margin: 0, fontSize: '0.9rem' }}>
                    Gestiona tu perfil y el de tus bebés.
                </p>
            </div>

            {/* ─── Role Card ─── */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="var(--color-primary-dark)" /> Soy...
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                        { val: 'madre', emoji: '🤱', label: 'Mamá' },
                        { val: 'padre', emoji: '👨‍🍼', label: 'Papá' }
                    ].map(opt => (
                        <button key={opt.val} type="button" onClick={() => setRole(opt.val)} style={{
                            flex: 1, padding: '12px', borderRadius: '14px',
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
                <button onClick={saveRole} className="button-primary" style={{
                    padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                    <Save size={16} />
                    {roleSaved ? '¡Guardado! ✅' : 'Guardar rol'}
                </button>
            </div>

            {/* ─── Baby Cards ─── */}
            <div style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Baby size={18} color="var(--color-primary-dark)" />
                Mis bebés ({babies.length})
            </div>

            {babies.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-light)' }}>
                    Aún no has registrado ningún bebé. Ve al Inicio para agregar uno.
                </div>
            )}

            {babies.map((baby) => (
                <div key={baby.id} className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {/* Baby card header — click to expand/collapse */}
                    <button type="button" onClick={() => toggleExpand(baby.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                        color: 'var(--color-text)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: baby.gender === 'niño'
                                    ? 'linear-gradient(135deg, #93c5fd, #3b82f6)'
                                    : 'linear-gradient(135deg, #f9a8d4, #ec4899)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.1rem',
                            }}>
                                {baby.gender === 'niño' ? '👦' : '👧'}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>{baby.name || 'Sin nombre'}</div>
                                {baby.saved && <div style={{ fontSize: '0.75rem', color: '#4d7c0f' }}>¡Guardado! ✅</div>}
                            </div>
                        </div>
                        {baby.expanded ? <ChevronUp size={18} color="var(--color-text-light)" /> : <ChevronDown size={18} color="var(--color-text-light)" />}
                    </button>

                    {baby.expanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                            {/* Name */}
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', display: 'block', marginBottom: '6px' }}>
                                    Nombre del Bebé
                                </label>
                                <input
                                    type="text"
                                    className="auth-input"
                                    style={{ paddingLeft: '14px' }}
                                    value={baby.name}
                                    onChange={e => updateBabyField(baby.id, 'name', e.target.value)}
                                    placeholder="Ej. Sofía"
                                />
                            </div>

                            {/* Date + Gender */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="auth-input-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={13} /> F. Nacimiento
                                    </label>
                                    <input type="date" className="auth-input" style={{ paddingLeft: '12px' }}
                                        max={today} value={baby.birth_date}
                                        onChange={e => updateBabyField(baby.id, 'birth_date', e.target.value)} />
                                </div>
                                <div className="auth-input-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <User size={13} /> Género
                                    </label>
                                    <select className="auth-input" style={{ paddingLeft: '12px' }}
                                        value={baby.gender}
                                        onChange={e => updateBabyField(baby.id, 'gender', e.target.value)}>
                                        <option value="">Seleccionar...</option>
                                        <option value="niña">Niña</option>
                                        <option value="niño">Niño</option>
                                    </select>
                                </div>
                            </div>

                            {/* Weight + Height */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div className="auth-input-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Weight size={13} /> Peso (kg)
                                    </label>
                                    <input type="number" step="0.01" className="auth-input" style={{ paddingLeft: '12px' }}
                                        value={baby.weight} placeholder="3.5"
                                        onChange={e => updateBabyField(baby.id, 'weight', e.target.value)} />
                                </div>
                                <div className="auth-input-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Ruler size={13} /> Altura (cm)
                                    </label>
                                    <input type="number" step="0.1" className="auth-input" style={{ paddingLeft: '12px' }}
                                        value={baby.height} placeholder="50"
                                        onChange={e => updateBabyField(baby.id, 'height', e.target.value)} />
                                </div>
                            </div>

                            <button
                                onClick={() => saveBaby(baby)}
                                disabled={baby.saving}
                                className="button-primary"
                                style={{ padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Save size={16} />
                                {baby.saving ? 'Guardando...' : `Guardar cambios de ${baby.name || 'bebé'}`}
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
