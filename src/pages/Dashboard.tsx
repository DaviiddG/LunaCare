import { Activity } from 'lucide-react';
import { AiAdvisor } from '../components/AiAdvisor';

export function Dashboard() {
    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '25px',
                    backgroundColor: 'var(--color-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                }}>
                    👶
                </div>
                <div>
                    <h2 style={{ margin: 0 }}>¡Hola, Mamá!</h2>
                    <p style={{ margin: 0, color: 'var(--color-text-light)' }}>Resumen de hoy</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="card" style={{ padding: '15px' }}>
                    <div style={{ color: 'var(--color-primary-dark)', marginBottom: '5px' }}>Última Comida</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Hace 2h</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Fórmula 150ml</div>
                </div>
                <div className="card" style={{ padding: '15px' }}>
                    <div style={{ color: 'var(--color-success)', marginBottom: '5px' }}>Último Pañal</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Hace 1h</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Limpio</div>
                </div>
                <div className="card" style={{ padding: '15px', gridColumn: 'span 2' }}>
                    <div style={{ color: 'var(--color-secondary-dark)', marginBottom: '5px' }}>Tiempo de Sueño (Hoy)</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>4h 30m</div>
                </div>
            </div>

            <h3 style={{ marginBottom: '15px' }}>Notificaciones</h3>
            <div className="card">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <Activity color="var(--color-warning)" style={{ marginTop: '2px' }} />
                    <div>
                        <div style={{ fontWeight: 'bold' }}>Hora de comer próxima</div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Basado en la última toma, el bebé podría tener hambre pronto.</p>
                    </div>
                </div>
            </div>

            <AiAdvisor
                lastFeeding="Hace 2h (Fórmula 150ml)"
                lastDiaper="Hace 1h (Limpio)"
                sleepTime="4h 30m"
            />
        </div>
    );
}
