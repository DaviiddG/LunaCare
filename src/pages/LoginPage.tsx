import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NeonGradientCard } from '../components/ui/neon-gradient-card';
import { AuroraText } from '../components/ui/aurora-text';
import { ShimmerButton } from '../components/ui/shimmer-button';

export function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setIsLoading(false);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-overlay"></div>

            <NeonGradientCard
                className="animate-fade-in w-full max-w-sm"
                neonColors={{ firstColor: '#9D85E1', secondColor: '#3994ef' }}
                borderSize={2}
                borderRadius={24}
                innerClassName="p-8 !rounded-[22px]"
            >
                <div style={{ textAlign: 'center', marginBottom: '35px' }}>
                    <img src="/logo.png" alt="LunaCare Logo" style={{ display: 'block', margin: '0 auto 15px auto', width: '64px', height: '64px', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }} />
                    <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '2.2rem', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                        <AuroraText>LunaCare</AuroraText>
                    </h1>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '1rem', fontWeight: 400 }}>
                        Tu aliada en el descanso de tu bebé ✨
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

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="auth-input-group">
                        <label>Correo Electrónico</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={20} color="var(--color-primary-dark)" style={{ position: 'absolute', left: '14px', top: '15px', opacity: 0.7 }} />
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
                            />
                        </div>
                    </div>

                    <ShimmerButton
                        type="submit"
                        shimmerColor="#ffffff"
                        shimmerSize="0.1em"
                        shimmerDuration="2s"
                        background="#9D85E1"
                        className="w-full text-white font-bold rounded-xl shadow-md h-14"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Iniciando sesión...' : 'Comenzar con LunaCare'}
                    </ShimmerButton>
                </form>

                <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--color-text-light)' }}>¿Eres nueva aquí? </span>
                    <Link to="/register" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                        Crea tu cuenta
                    </Link>
                </div>
            </NeonGradientCard>
        </div>
    );
}
