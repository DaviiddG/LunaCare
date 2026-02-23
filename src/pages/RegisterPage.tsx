import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NeonGradientCard } from '../components/ui/neon-gradient-card';
import { AuroraText } from '../components/ui/aurora-text';
import { ShimmerButton } from '../components/ui/shimmer-button';

export function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [role, setRole] = useState<'madre' | 'padre' | ''>('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (role) {
            document.documentElement.setAttribute('data-role', role);
        } else {
            document.documentElement.removeAttribute('data-role');
        }

        // Cleanup when leaving the register page without a user
        return () => {
            document.documentElement.removeAttribute('data-role');
        };
    }, [role]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!role) { setError('Por favor selecciona si eres mamá o papá.'); return; }
        setIsLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, role }
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

            <NeonGradientCard
                className="animate-fade-in w-full max-w-sm"
                neonColors={{ firstColor: '#9D85E1', secondColor: '#3994ef' }}
                borderSize={2}
                borderRadius={24}
                innerClassName="p-8 !rounded-[22px]"
            >
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <img src="/logo.png" alt="LunaCare Logo" style={{ display: 'block', margin: '0 auto 15px auto', width: '64px', height: '64px', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }} />
                    <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '2.2rem', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                        <AuroraText>{role === 'padre' ? '¡Bienvenido!' : '¡Bienvenida!'}</AuroraText>
                    </h1>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '1rem' }}>
                        Únete a la comunidad de padres proactivos ✨
                    </p>
                </div>

                {error && (
                    <div className="animate-fade-in" style={{
                        backgroundColor: 'rgba(254, 226, 226, 0.9)', color: '#b91c1c',
                        padding: '14px', borderRadius: '12px', marginBottom: '20px',
                        fontSize: '0.9rem', textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Role selector */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px', color: 'var(--color-text-light)' }}>
                            ¿Eres...?
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                                { val: 'madre' as const, emoji: '🤱', label: 'Soy Mamá' },
                                { val: 'padre' as const, emoji: '👨‍🍼', label: 'Soy Papá' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    type="button"
                                    onClick={() => setRole(opt.val)}
                                    style={{
                                        padding: '14px 10px',
                                        borderRadius: '16px',
                                        border: `2px solid ${role === opt.val ? 'var(--color-primary-dark)' : 'var(--color-border)'}`,
                                        background: role === opt.val ? 'rgba(232,134,159,0.12)' : 'transparent',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        fontWeight: 700, fontSize: '0.95rem',
                                        color: role === opt.val ? 'var(--color-primary-dark)' : 'var(--color-text)'
                                    }}
                                >
                                    <span style={{ fontSize: '1.8rem' }}>{opt.emoji}</span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="auth-input-group">
                        <label>Tu nombre</label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} color="var(--color-primary-dark)" style={{ position: 'absolute', left: '14px', top: '15px', opacity: 0.7 }} />
                            <input type="text" className="auth-input" value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={role === 'padre' ? 'Carlos' : 'María'} required />
                        </div>
                    </div>

                    <div className="auth-input-group">
                        <label>Correo Electrónico</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={20} color="var(--color-primary-dark)" style={{ position: 'absolute', left: '14px', top: '15px', opacity: 0.7 }} />
                            <input type="email" className="auth-input" value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="hola@correo.com" required />
                        </div>
                    </div>

                    <div className="auth-input-group" style={{ marginBottom: '28px' }}>
                        <label>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} color="var(--color-primary-dark)" style={{ position: 'absolute', left: '14px', top: '15px', opacity: 0.7 }} />
                            <input type="password" className="auth-input" value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" required minLength={6} />
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
                        {isLoading ? 'Creando cuenta...' : 'Empezar ahora ✨'}
                    </ShimmerButton>
                </form>

                <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--color-text-light)' }}>¿Ya tienes cuenta? </span>
                    <Link to="/login" style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                        Inicia sesión
                    </Link>
                </div>
            </NeonGradientCard>
        </div>
    );
}
