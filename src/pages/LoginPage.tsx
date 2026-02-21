import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Baby } from 'lucide-react';

export function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Mock login delay
        setTimeout(() => {
            setIsLoading(false);
            navigate('/');
        }, 1000);
    };

    return (
        <div className="app-container" style={{ justifyContent: 'center', padding: '20px' }}>
            <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '40px',
                    backgroundColor: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px auto',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <Baby size={40} color="white" />
                </div>
                <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '2rem', marginBottom: '10px' }}>
                    LunaCare
                </h1>
                <p style={{ color: 'var(--color-text-light)' }}>Tu compañero en el cuidado de tu bebé</p>
            </div>

            <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Iniciar Sesión</h2>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                        {isLoading ? 'Iniciando...' : 'Entrar'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-text-light)' }}>¿No tienes cuenta? </span>
                    <Link to="/register" style={{ fontWeight: 600 }}>Regístrate aquí</Link>
                </div>
            </div>
        </div>
    );
}
