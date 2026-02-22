import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Baby, Moon, Droplet, Sun, LogOut, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function AppLayout() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Apply role-based color theme
    useEffect(() => {
        const role = (user?.user_metadata?.role as string) || '';
        if (role) document.documentElement.setAttribute('data-role', role);
        else document.documentElement.removeAttribute('data-role');
    }, [user]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const btnStyle = {
        padding: '10px',
        borderRadius: '12px',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        border: 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
    };

    return (
        <div className="app-container">
            {/* ── Background Video ── */}
            <video
                autoPlay
                loop
                muted
                playsInline
                style={{
                    position: 'fixed',
                    top: 0, left: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    zIndex: -2,
                    pointerEvents: 'none',
                }}
                src="/bg-video.mp4"
            />
            {/* Semi-transparent overlay so UI stays readable */}
            <div style={{
                position: 'fixed',
                top: 0, left: 0,
                width: '100%', height: '100%',
                zIndex: -1,
                background: 'var(--video-overlay, rgba(0,0,0,0.45))',
                backdropFilter: 'blur(1px)',
                pointerEvents: 'none',
            }} />

            <header style={{
                padding: '15px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                transition: 'all var(--transition-normal)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/logo.png" alt="LunaCare Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                    <h1 style={{ color: 'var(--color-primary-dark)', fontSize: '1.25rem', margin: 0 }}>
                        LunaCare
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={toggleTheme} style={btnStyle} title="Cambiar tema">
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                    <button onClick={() => navigate('/settings')} style={btnStyle} title="Perfil del bebé">
                        <Settings size={20} />
                    </button>
                    <button onClick={handleLogout} style={{ ...btnStyle, color: '#EF4444' }} title="Cerrar sesión">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="main-content">
                <Outlet />
            </main>

            <nav className="bottom-nav">
                <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Home size={24} />
                    <span>Inicio</span>
                </NavLink>

                <NavLink to="/diet" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Droplet size={24} />
                    <span>Dieta</span>
                </NavLink>

                <NavLink to="/diapers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Baby size={24} />
                    <span>Pañales</span>
                </NavLink>

                <NavLink to="/sleep" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Moon size={24} />
                    <span>Sueño</span>
                </NavLink>
            </nav>
        </div>
    );
}
