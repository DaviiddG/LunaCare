import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LunaChatModal } from '../LunaChatModal';

export function AppLayout() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [isLunaOpen, setIsLunaOpen] = useState(false);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleThemeSync = () => {
            setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        };
        window.addEventListener('theme-changed', handleThemeSync);
        return () => window.removeEventListener('theme-changed', handleThemeSync);
    }, []);

    // Apply role-based color theme
    useEffect(() => {
        const role = (user?.user_metadata?.role as string) || '';
        if (role) document.documentElement.setAttribute('data-role', role);
        else document.documentElement.removeAttribute('data-role');
    }, [user]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        if (newTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', newTheme);
        window.dispatchEvent(new Event('theme-changed'));
    };

    const handleLogout = async () => {
        setTheme('light');
        localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.removeAttribute('data-role');
        await supabase.auth.signOut();
        navigate('/login');
    };



    return (
        <div className="bg-background-light dark:bg-[#121212] min-h-screen">
            {/* Header logic is now handled in pages or simplified here */}
            {window.location.pathname !== '/' && window.location.pathname !== '/diapers' && window.location.pathname !== '/diet' && window.location.pathname !== '/bottle' && window.location.pathname !== '/settings' && window.location.pathname !== '/solids' && (
                <header className="fixed top-0 w-full z-50 bg-background-light/80 dark:bg-[#121212]/80 backdrop-blur-2xl px-6 pt-12 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm">
                                <span className="text-primary font-bold text-lg">{user?.email?.[0].toUpperCase() || 'D'}</span>
                            </div>
                            <div>
                                <h2 className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-none">Usuario</h2>
                                <p className="font-bold text-slate-800 dark:text-white capitalize">{user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Padre'}</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95" onClick={toggleTheme}>
                                <span className={`material-symbols-rounded ${theme === 'dark' ? 'text-yellow-400' : 'text-slate-600'}`}>
                                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                                </span>
                            </button>
                            <button className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95" onClick={handleLogout}>
                                <span className="material-symbols-rounded text-red-500">logout</span>
                            </button>
                        </div>
                    </div>
                </header>
            )}

            <main className={window.location.pathname === '/' || window.location.pathname === '/diapers' || window.location.pathname === '/diet' || window.location.pathname === '/bottle' || window.location.pathname === '/settings' || window.location.pathname === '/solids' ? '' : 'pt-28'}>
                <Outlet />
            </main>

            <nav className="fixed bottom-0 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-100 dark:border-slate-800 px-4 pt-3 pb-8 z-50">
                <div className="flex justify-around items-center max-w-md mx-auto">
                    <NavLink to="/" end className={({ isActive }) => `flex flex-col items-center space-y-1 w-20 transition-all ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                        <span className="material-symbols-rounded">home</span>
                        <span className="text-[10px] font-bold">Inicio</span>
                    </NavLink>

                    <NavLink to="/reports" className={({ isActive }) => `flex flex-col items-center space-y-1 w-20 transition-all ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                        <span className="material-symbols-rounded">bar_chart</span>
                        <span className="text-[10px] font-medium">Reportes</span>
                    </NavLink>

                    <button
                        onClick={() => setIsLunaOpen(true)}
                        className={`flex flex-col items-center space-y-1 w-20 transition-all ${isLunaOpen ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}
                    >
                        <span className="material-symbols-rounded">auto_awesome</span>
                        <span className="text-[10px] font-medium">Luna AI</span>
                    </button>

                    <NavLink to="/settings" className={({ isActive }) => `flex flex-col items-center space-y-1 w-20 transition-all ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                        <span className="material-symbols-rounded">settings</span>
                        <span className="text-[10px] font-medium">Configuración</span>
                    </NavLink>
                </div>
            </nav>

            <LunaChatModal isOpen={isLunaOpen} onClose={() => setIsLunaOpen(false)} />
        </div>
    );

}
