import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                }
            }
        });

        if (authError) {
            setError(authError.message);
            setIsLoading(false);
        } else {
            setIsLoading(false);
            alert('¡Registro exitoso! Por favor revisa tu correo para confirmar o inicia sesión.');
            navigate('/login');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-overlay"></div>

            <div className="glass-card animate-fade-in" style={{ padding: '30px 25px' }}>
                <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                    <img src="/logo.png" alt="LunaCare Logo" style={{ width: '50px', height: '50px', marginBottom: '12px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }} />
                    <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '1.8rem', margin: '0 0 5px 0', letterSpacing: '-0.5px' }}>
                        Bienvenida
                    </h1>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                        Crea tu cuenta para cuidar a tu bebé
                    </p>
                </div>

                {error && (
                    <div className="animate-fade-in" style={{
                        backgroundColor: 'rgba(254, 226, 226, 0.9)',
                        color: '#b91c1c',
                        padding: '12px',
                        borderRadius: '12px',
                        marginBottom: '15px',
                        fontSize: '0.85rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="auth-input-group">
                        <label>Tu Nombre</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} color="var(--color-primary-dark)" style={{ position: 'absolute', left: '14px', top: '15px', opacity: 0.7 }} />
                            <input
                                type="text"
                                className="auth-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej. María"
                                required
                            />
                        </div>
                    </div>

                    <div className="auth-input-group">
                        <label>Correo Electrónico</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} color="var(--color-primary-dark)" style={{ position: 'absolute', left: '14px', top: '15px', opacity: 0.7 }} />
                            <input
                                type="email"
                                className="auth-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@correo.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="auth-input-group" style={{ marginBottom: '25px' }}>
                        <label>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} color="var(--color-primary-dark)" style={{ position: 'absolute', left: '14px', top: '15px', opacity: 0.7 }} />
                            <input
                                type="password"
                                className="auth-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="button-primary"
                        style={{ padding: '15px', fontSize: '1rem' }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Registrando...' : 'Empezar ahora'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-text-light)' }}>¿Ya eres parte de LunaCare? </span>
                    <Link to="/login" style={{ fontWeight: 700, color: 'var(--color-secondary-dark)' }}>
                        Inicia sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
