import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LunaChatModal } from '../LunaChatModal';
import { AnimatedThemeToggler } from '../AnimatedThemeToggler';
import { Dock, DockIcon } from '../ui/dock';

export function AppLayout() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [isLunaOpen, setIsLunaOpen] = useState(false);
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');

    useEffect(() => {
        const handleSettingsUpdate = () => {
            setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        };
        window.addEventListener('luna-settings-updated', handleSettingsUpdate);
        return () => window.removeEventListener('luna-settings-updated', handleSettingsUpdate);
    }, []);

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



    const handleLogout = async () => {
        setTheme('light');
        localStorage.setItem('theme', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.removeAttribute('data-role');
        await supabase.auth.signOut();
        navigate('/login');
    };



    return (
        <div className="bg-background-light dark:bg-[#121212] min-h-screen">
            {/* Header logic is now handled in pages or simplified here */}
            {window.location.pathname !== '/' && window.location.pathname !== '/diapers' && window.location.pathname !== '/diet' && window.location.pathname !== '/reports' && window.location.pathname !== '/bottle' && window.location.pathname !== '/settings' && window.location.pathname !== '/solids' && window.location.pathname !== '/sleep' && (
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
                            <AnimatedThemeToggler className="w-10 h-10 shadow-sm border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none" />
                            <button className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95" onClick={handleLogout}>
                                <span className="material-symbols-rounded text-red-500">logout</span>
                            </button>
                        </div>
                    </div>
                </header>
            )}

            <main className={window.location.pathname === '/' || window.location.pathname === '/diapers' || window.location.pathname === '/diet' || window.location.pathname === '/reports' || window.location.pathname === '/bottle' || window.location.pathname === '/settings' || window.location.pathname === '/solids' || window.location.pathname === '/sleep' ? '' : 'pt-28'}>
                <Outlet />
            </main>

            {window.location.pathname === '/' || window.location.pathname === '/reports' || window.location.pathname === '/settings' ? (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full">
                    <div className="pointer-events-auto">
                        <Dock className="bg-white/90 dark:bg-slate-900/90 border-slate-100 dark:border-slate-800 backdrop-blur-2xl px-4 shadow-lg shadow-primary/5">
                            <DockIcon>
                                <NavLink to="/" end className={({ isActive }) => `flex items-center justify-center w-full h-full transition-all rounded-full ${isActive ? 'text-primary bg-primary/10' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                    <span className="material-symbols-rounded text-2xl">home</span>
                                </NavLink>
                            </DockIcon>

                            <DockIcon>
                                <NavLink to="/reports" className={({ isActive }) => `flex items-center justify-center w-full h-full transition-all rounded-full ${isActive ? 'text-primary bg-primary/10' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                    <span className="material-symbols-rounded text-2xl">bar_chart</span>
                                </NavLink>
                            </DockIcon>

                            <DockIcon>
                                <button
                                    onClick={() => setIsLunaOpen(true)}
                                    className={`flex items-center justify-center w-full h-full transition-all rounded-full overflow-hidden ${isLunaOpen ? 'ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : 'hover:scale-110 active:scale-95'}`}
                                >
                                    <div className="w-[30px] h-[30px] rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md">
                                        <img src={lunaIcon} alt="Luna AI" className="w-full h-full object-cover" />
                                    </div>
                                </button>
                            </DockIcon>

                            <DockIcon>
                                <NavLink to="/settings" className={({ isActive }) => `flex items-center justify-center w-full h-full transition-all rounded-full ${isActive ? 'text-primary bg-primary/10' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                    <span className="material-symbols-rounded text-2xl">settings</span>
                                </NavLink>
                            </DockIcon>
                        </Dock>
                    </div>
                </div>
            ) : null}

            <LunaChatModal isOpen={isLunaOpen} onClose={() => setIsLunaOpen(false)} />
        </div>
    );

}
