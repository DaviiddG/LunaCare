import { Baby } from 'lucide-react';

export function DiapersPage() {
    return (
        <div className="animate-fade-in">
            <h2 style={{ marginBottom: '20px' }}>Registro de Pañales</h2>

            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--color-success)' }}>¿Cómo estaba el pañal?</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    <button className="button-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '12px', backgroundColor: 'var(--color-secondary)' }}></div>
                        <span>Mojado</span>
                    </button>
                    <button className="button-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '12px', backgroundColor: '#dca060' }}></div>
                        <span>Sucio</span>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontWeight: 500 }}>Observaciones (Color, consistencia)</label>
                    <textarea
                        placeholder="Normal, un poco líquido..."
                        style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #ccc',
                            fontFamily: 'inherit',
                            minHeight: '80px'
                        }}
                    />

                    <button className="button-primary" style={{ marginTop: '15px', backgroundColor: 'var(--color-success)' }}>
                        Guardar Registro
                    </button>
                </div>
            </div>

            <h3 style={{ marginBottom: '15px' }}>Registros Recientes</h3>
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Baby size={20} color="var(--color-success)" />
                        <span>Mojado</span>
                    </div>
                    <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Hace 1 hr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Baby size={20} color="#dca060" />
                        <span>Sucio (Normal)</span>
                    </div>
                    <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Hace 4 hrs</span>
                </div>
            </div>
        </div>
    );
}
