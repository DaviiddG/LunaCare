import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

export function SleepPage() {
    const [isSleeping, setIsSleeping] = useState(false);

    return (
        <div className="animate-fade-in">
            <h2 style={{ marginBottom: '20px' }}>Registro de Sueño</h2>

            <div className="card" style={{ marginBottom: '20px', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--color-secondary-dark)' }}>
                    {isSleeping ? 'El bebé está durmiendo' : 'El bebé está despierto'}
                </h3>

                <div style={{ margin: '20px 0' }}>
                    {isSleeping ? (
                        <div className="animate-fade-in" style={{ display: 'inline-block', padding: '20px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)' }}>
                            <Moon size={64} color="white" />
                        </div>
                    ) : (
                        <div className="animate-fade-in" style={{ display: 'inline-block', padding: '20px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }}>
                            <Sun size={64} color="white" />
                        </div>
                    )}
                </div>

                <button
                    className="button-primary"
                    style={{
                        fontSize: '1.2rem',
                        padding: '16px 32px',
                        backgroundColor: isSleeping ? 'var(--color-warning)' : 'var(--color-secondary-dark)'
                    }}
                    onClick={() => setIsSleeping(!isSleeping)}
                >
                    {isSleeping ? 'Despertar al bebé' : 'Empezar a dormir'}
                </button>
            </div>

            <h3 style={{ marginBottom: '15px' }}>Registros Recientes</h3>
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Moon size={20} color="var(--color-secondary-dark)" />
                        <span>Siesta</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold' }}>1h 30m</div>
                        <div style={{ color: 'var(--color-text-light)', fontSize: '0.8rem' }}>10:00 - 11:30 AM</div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Moon size={20} color="var(--color-secondary-dark)" />
                        <span>Sueño Nocturno</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold' }}>8h 15m</div>
                        <div style={{ color: 'var(--color-text-light)', fontSize: '0.8rem' }}>21:00 - 05:15 AM</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
