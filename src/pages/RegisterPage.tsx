import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Baby Data
    const [babyName, setBabyName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { data: authData, error: authError } = await supabase.auth.signUp({
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
            return;
        }

        if (authData.user) {
            // Insert baby profile
            const { error: profileError } = await supabase
                .from('baby_profiles')
                .insert([{
                    user_id: authData.user.id,
                    name: babyName,
                    birth_date: birthDate,
                    weight: weight ? parseFloat(weight) : null,
                    height: height ? parseFloat(height) : null
                }]);

            if (profileError) {
                console.error("Error saving baby profile:", profileError);
                // We don't stop the whole process as auth succeeded, but let's notify
            }
        }

        setIsLoading(false);
        alert('¡Registro exitoso! Por favor inicia sesión.');
        navigate('/login');
    };

    return (
        <div className="auth-page">
            <div className="auth-overlay"></div>

            <div className="glass-card animate-fade-in" style={{ padding: '30px 25px', maxWidth: '450px' }}>
                <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                    <img src="/logo.png" alt="LunaCare Logo" style={{ width: '50px', height: '50px', marginBottom: '12px', borderRadius: '12px' }} />
                    <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '1.8rem', margin: '0 0 5px 0' }}>
                        Bienvenida
                    </h1>
                    <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                        Crea tu perfil y el de tu bebé
                    </p>
                </div>

                {error && (
                    <div className="animate-fade-in" style={{
                        backgroundColor: 'rgba(254, 226, 226, 0.9)',
                        color: '#b91c1c',
                        padding: '12px',
                        borderRadius: '12px',
                        marginBottom: '15px',
                        fontSize: '0.85rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="auth-input-group" style={{ marginBottom: 0 }}>
                            <label>Tu Nombre</label>
                            <input
                                type="text"
                                className="auth-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="María"
                                style={{ paddingLeft: '15px' }}
                                required
                            />
                        </div>
                        <div className="auth-input-group" style={{ marginBottom: 0 }}>
                            <label>Nombre del Bebé</label>
                            <input
                                type="text"
                                className="auth-input"
                                value={babyName}
                                onChange={(e) => setBabyName(e.target.value)}
                                placeholder="Luna"
                                style={{ paddingLeft: '15px' }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="auth-input-group" style={{ marginBottom: 0 }}>
                            <label>Email</label>
                            <input
                                type="email"
                                className="auth-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="hola@mama.com"
                                style={{ paddingLeft: '15px' }}
                                required
                            />
                        </div>
                        <div className="auth-input-group" style={{ marginBottom: 0 }}>
                            <label>Password</label>
                            <input
                                type="password"
                                className="auth-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="******"
                                style={{ paddingLeft: '15px' }}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="auth-input-group" style={{ marginBottom: 0 }}>
                            <label>Fecha Nacimiento</label>
                            <input
                                type="date"
                                className="auth-input"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                style={{ paddingLeft: '15px' }}
                            />
                        </div>
                        <div className="auth-input-group" style={{ marginBottom: 0 }}>
                            <label>Peso (kg)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="auth-input"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="3.5"
                                style={{ paddingLeft: '15px' }}
                            />
                        </div>
                    </div>

                    <div className="auth-input-group" style={{ marginBottom: '10px' }}>
                        <label>Altura (cm)</label>
                        <input
                            type="number"
                            step="0.1"
                            className="auth-input"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="50"
                            style={{ paddingLeft: '15px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="button-primary"
                        style={{ padding: '15px', fontSize: '1rem' }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Registrando...' : 'Crear Cuenta ✨'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-text-light)' }}>¿Ya tienes cuenta? </span>
                    <Link to="/login" style={{ fontWeight: 700, color: 'var(--color-secondary-dark)' }}>
                        Inicia sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}

