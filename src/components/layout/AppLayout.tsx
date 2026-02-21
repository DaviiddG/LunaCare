import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Baby, Moon, Droplet, Sun } from 'lucide-react';

export function AppLayout() {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
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
                <button
                    onClick={toggleTheme}
                    style={{
                        padding: '8px',
                        borderRadius: '50%',
                        background: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Cambiar tema"
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </header>

            <main className="main-content">
                <Outlet />
            </main>

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
            </nav>
        </div>
    );
}

