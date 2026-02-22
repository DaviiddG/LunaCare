

interface Baby {
    id: string;
    name: string;
    gender?: string;
}

interface BabySelectorProps {
    babies: Baby[];
    selectedBaby: Baby | null;
    onSelect: (baby: Baby) => void;
}

/**
 * Shows a pill-based baby selector ONLY when there are 2 or more babies.
 * Returns null when there's only 0 or 1 baby.
 */
export function BabySelector({ babies, selectedBaby, onSelect }: BabySelectorProps) {
    if (babies.length <= 1) return null;

    return (
        <div style={{
            marginBottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-light)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                ¿Para quién?
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {babies.map(baby => {
                    const isSelected = selectedBaby?.id === baby.id;
                    const babyColor = baby.gender === 'niño' ? '#3b82f6' : 'var(--color-primary-dark)';
                    const babyGrad = baby.gender === 'niño'
                        ? 'linear-gradient(135deg, #93c5fd, #3b82f6)'
                        : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))';

                    return (
                        <button
                            key={baby.id}
                            type="button"
                            onClick={() => onSelect(baby)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                borderRadius: '50px',
                                border: `2px solid ${isSelected ? babyColor : 'var(--color-border)'}`,
                                background: isSelected ? babyGrad : 'rgba(255,255,255,0.12)',
                                color: isSelected ? 'white' : 'var(--color-text)',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                boxShadow: isSelected
                                    ? `0 4px 14px color-mix(in srgb, ${babyColor} 35%, transparent)`
                                    : 'none',
                                backdropFilter: 'blur(8px)',
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>
                                {baby.gender === 'niño' ? '👦' : '👧'}
                            </span>
                            {baby.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
