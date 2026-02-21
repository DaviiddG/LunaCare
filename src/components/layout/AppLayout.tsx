import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Baby, Moon, Droplet, Sun, LogOut, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LunaAssistant } from '../LunaAssistant';

export function AppLayout() {
    const navigate = useNavigate();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="app-container">
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
                    <button
                        onClick={toggleTheme}
                        style={{
                            padding: '10px',
                            borderRadius: '12px',
                            background: 'var(--color-bg)',
                            color: 'var(--color-text)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                        title="Cambiar tema"
                    >
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '10px',
                            borderRadius: '12px',
                            background: 'var(--color-bg)',
                            color: 'var(--color-text)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                        title="Cerrar sesión"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>


            <main className="main-content">
                <Outlet />
            </main>

            <LunaAssistant />

            <nav className="bottom-nav">
                <NavLink
                    to="/"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Home size={24} />
                    <span>Inicio</span>
                </NavLink>

                <NavLink
                    to="/diet"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Droplet size={24} />
                    <span>Dieta</span>
                </NavLink>

                <NavLink
                    to="/diapers"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Baby size={24} />
                    <span>Pañales</span>
                </NavLink>

                <NavLink
                    to="/sleep"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Moon size={24} />
                    <span>Sueño</span>
                </NavLink>

                <NavLink
                    to="/settings"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Settings size={24} />
                    <span>Ajustes</span>
                </NavLink>
            </nav>
        </div>
    );
}

