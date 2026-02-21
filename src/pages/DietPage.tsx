import { Droplet, Milk, Utensils } from 'lucide-react';

export function DietPage() {
    return (
        <div className="animate-fade-in">
            <h2 style={{ marginBottom: '20px' }}>Registro de Alimentación</h2>

            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--color-primary-dark)' }}>¿Qué comió el bebé?</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    <button className="button-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Droplet size={24} color="var(--color-primary)" />
                        <span>Pecho</span>
                    </button>
                    <button className="button-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Milk size={24} color="var(--color-secondary-dark)" />
                        <span>Fórmula</span>
                    </button>
                    <button className="button-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Utensils size={24} color="var(--color-warning)" />
                        <span>Sólidos</span>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontWeight: 500 }}>Cantidad (ml o gramos)</label>
                    <input
                        type="number"
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
                        placeholder="¿Cómo lo toleró? etc."
                        style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #ccc',
                            fontFamily: 'inherit',
                            minHeight: '80px'
                        }}
                    />

                    <button className="button-primary" style={{ marginTop: '15px' }}>
                        Guardar Registro
                    </button>
                </div>
            </div>

            <h3 style={{ marginBottom: '15px' }}>Registros Recientes</h3>
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Milk size={20} color="var(--color-secondary-dark)" />
                        <span>Fórmula - 150ml</span>
                    </div>
                    <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Hace 2 hrs</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Droplet size={20} color="var(--color-primary)" />
                        <span>Pecho - 15 min</span>
                    </div>
                    <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Hace 5 hrs</span>
                </div>
            </div>
        </div>
    );
}
