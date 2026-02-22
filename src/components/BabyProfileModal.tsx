import { useState } from 'react';
import { Baby, Calendar, Weight, Ruler } from 'lucide-react';

interface BabyProfileModalProps {
    onSave: (data: {
        name: string;
        birth_date: string;
        weight: number | null;
        height: number | null;
        gender: string;
    }) => Promise<void>;
}

export function BabyProfileModal({ onSave }: BabyProfileModalProps) {
    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [gender, setGender] = useState('');
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name || !birthDate) return;
        setSaving(true);
        setErrorMsg(null);
        try {
            await onSave({
                name,
                birth_date: birthDate,
                weight: weight ? parseFloat(weight) : null,
                height: height ? parseFloat(height) : null,
                gender,
            });
        } catch (err: any) {
            setErrorMsg(err?.message || 'Error al guardar. Intenta de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
            <div className="animate-slide-up" style={{
                width: '100%', maxWidth: '480px',
                background: 'var(--color-surface)',
                borderRadius: '28px 28px 0 0',
                padding: '32px 24px 44px',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.4)',
            }}>
                {/* Handle bar */}
                <div style={{ width: '40px', height: '4px', borderRadius: '4px', background: 'var(--color-border)', margin: '0 auto 24px' }} />

                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{
                        width: '70px', height: '70px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 25px rgba(232,134,159,0.5)',
                        fontSize: '2rem'
                    }}>
                        🍼
                    </div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '1.5rem' }}>¡Cuéntame sobre tu bebé!</h2>
                    <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: '0.95rem' }}>
                        Vamos a personalizar tu experiencia
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Nombre */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-light)' }}>
                            <Baby size={14} /> Nombre del bebé *
                        </label>
                        <input
                            type="text"
                            className="auth-input"
                            placeholder="ej: Sofía"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ padding: '14px 16px' }}
                        />
                    </div>

                    {/* Fecha de nacimiento */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-light)' }}>
                            <Calendar size={14} /> Fecha de nacimiento *
                        </label>
                        <input
                            type="date"
                            className="auth-input"
                            value={birthDate}
                            onChange={e => setBirthDate(e.target.value)}
                            style={{ padding: '14px 16px' }}
                        />
                    </div>

                    {/* Peso y Altura */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-light)' }}>
                                <Weight size={14} /> Peso (kg)
                            </label>
                            <input
                                type="number"
                                className="auth-input"
                                placeholder="ej: 3.5"
                                value={weight}
                                onChange={e => setWeight(e.target.value)}
                                step="0.1"
                                style={{ padding: '14px 16px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-light)' }}>
                                <Ruler size={14} /> Altura (cm)
                            </label>
                            <input
                                type="number"
                                className="auth-input"
                                placeholder="ej: 50"
                                value={height}
                                onChange={e => setHeight(e.target.value)}
                                style={{ padding: '14px 16px' }}
                            />
                        </div>
                    </div>

                    {/* Sexo */}
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', display: 'block', color: 'var(--color-text-light)' }}>Sexo</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[{ val: 'niña', emoji: '👧', label: 'Niña' }, { val: 'niño', emoji: '👦', label: 'Niño' }].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => setGender(opt.val)}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '14px',
                                        border: `2px solid ${gender === opt.val ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        background: gender === opt.val ? 'rgba(232,134,159,0.1)' : 'var(--color-bg)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600,
                                        color: 'var(--color-text)'
                                    }}
                                >
                                    <span style={{ fontSize: '1.5rem' }}>{opt.emoji}</span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {errorMsg && (
                        <div style={{
                            background: 'rgba(254,226,226,0.9)', color: '#b91c1c',
                            padding: '12px 16px', borderRadius: '12px',
                            fontSize: '0.88rem', fontWeight: 600, textAlign: 'center'
                        }}>
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    <button
                        className="button-primary"
                        onClick={handleSave}
                        disabled={!name || !birthDate || saving}
                        style={{ padding: '16px', fontSize: '1.05rem', marginTop: '8px', opacity: (!name || !birthDate) ? 0.6 : 1 }}
                    >
                        {saving ? 'Guardando...' : '¡Listo! Empezar 🚀'}
                    </button>
                </div>
            </div>
        </div>
    );
}
