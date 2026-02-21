import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Baby } from 'lucide-react';

export function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Mock register delay
        setTimeout(() => {
            setIsLoading(false);
            navigate('/');
        }, 1000);
    };

    return (
        <div className="app-container" style={{ justifyContent: 'center', padding: '20px' }}>
            <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '30px',
                    backgroundColor: 'var(--color-secondary-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px auto',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <Baby size={30} color="white" />
                </div>
                <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '1.5rem' }}>
                    Crea tu cuenta
                </h1>
            </div>

            <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Tu Nombre (Mamá)</label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} color="var(--color-text-light)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej. María"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid #ccc',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Correo Electrónico</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={20} color="var(--color-text-light)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@correo.com"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid #ccc',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} color="var(--color-text-light)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid #ccc',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="button-primary"
                        style={{ marginTop: '10px' }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Registrando...' : 'Registrarse'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-text-light)' }}>¿Ya tienes cuenta? </span>
                    <Link to="/login" style={{ fontWeight: 600 }}>Inicia sesión</Link>
                </div>
            </div>
        </div>
    );
}
