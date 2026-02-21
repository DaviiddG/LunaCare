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
                data: { full_name: name }
            }
        });

        if (authError) {
            setError(authError.message);
            setIsLoading(false);
            return;
        }

        setIsLoading(false);
        navigate('/login');
    };

    return (
        <div className="auth-page">
            <div className="auth-overlay"></div>

            <div className="glass-card animate-fade-in">
                <div style={{ textAlign: 'center', marginBottom: '35px' }}>
                    <img src="/logo.png" alt="LunaCare Logo" style={{ width: '64px', height: '64px', marginBottom: '15px', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }} />
                    <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '2.2rem', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                        Bienvenida
                    </h1>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '1rem', fontWeight: 400 }}>
                        Crea tu cuenta de mamá ✨
                    </p>
                </div>

                {error && (
                    <div className="animate-fade-in" style={{
                        backgroundColor: 'rgba(254, 226, 226, 0.9)',
                        color: '#b91c1c',
                        padding: '14px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        border: '1px solid rgba(185, 28, 28, 0.1)',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="auth-input-group">
                        <label>Tu nombre</label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} color="var(--color-primary-dark)" style={{ position: 'absolute', left: '14px', top: '15px', opacity: 0.7 }} />
                            <input
                                type="text"
                                className="auth-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="María"
                                required
                            />
                        </div>
                    </div>

                    <div className="auth-input-group">
                        <label>Correo Electrónico</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={20} color="var(--color-primary-dark)" style={{ position: 'absolute', left: '14px', top: '15px', opacity: 0.7 }} />
                            <input
                                type="email"
                                className="auth-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="hola@mama.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="auth-input-group" style={{ marginBottom: '30px' }}>
                        <label>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} color="var(--color-primary-dark)" style={{ position: 'absolute', left: '14px', top: '15px', opacity: 0.7 }} />
                            <input
                                type="password"
                                className="auth-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="button-primary"
                        style={{
                            padding: '16px',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creando cuenta...' : 'Crear Cuenta ✨'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--color-text-light)' }}>¿Ya tienes cuenta? </span>
                    <Link to="/login" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                        Inicia sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
