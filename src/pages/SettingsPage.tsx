import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AnimatedThemeToggler } from '../components/AnimatedThemeToggler';

const today = new Date().toISOString().split('T')[0];

type BabyForm = {
    id: string;
    name: string;
    birth_date: string;
    weight: string;
    height: string;
    gender: string;
    expanded: boolean;
    saving: boolean;
    saved: boolean;
};

export function SettingsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [babies, setBabies] = useState<BabyForm[]>([]);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileName, setProfileName] = useState('');

    useEffect(() => {
        if (user) {
            setProfileName(user.user_metadata?.full_name || 'Padre/Madre');
            fetchBabies();
        }
    }, [user]);

    const fetchBabies = async () => {
        setIsLoading(true);
        const { data } = await dbHelpers.getAllBabyProfiles(user!.id);
        if (data) {
            setBabies(data.map((b: any) => ({
                id: b.id,
                name: b.name || '',
                birth_date: b.birth_date || '',
                weight: b.weight?.toString() || '',
                height: b.height?.toString() || '',
                gender: b.gender || '',
                expanded: false,
                saving: false,
                saved: false,
            })));
        }
        setIsLoading(false);
    };

    const toggleExpand = (id: string) => {
        setBabies(prev => prev.map(b => b.id === id ? { ...b, expanded: !b.expanded } : b));
    };

    const updateBabyField = (id: string, field: string, value: string) => {
        setBabies(prev => prev.map(b => b.id === id ? { ...b, [field]: value, saved: false } : b));
    };

    const saveBaby = async (baby: BabyForm) => {
        if (!user) return;
        setBabies(prev => prev.map(b => b.id === baby.id ? { ...b, saving: true } : b));

        const { error } = await dbHelpers.upsertBabyProfile({
            id: baby.id,
            user_id: user.id,
            name: baby.name,
            birth_date: baby.birth_date,
            weight: parseFloat(baby.weight) || 0,
            height: parseFloat(baby.height) || 0,
            gender: baby.gender,
        });

        setBabies(prev => prev.map(b =>
            b.id === baby.id ? { ...b, saving: false, saved: !error } : b
        ));
    };



    const handleLogout = async () => {
        localStorage.setItem('theme', 'light');
        document.documentElement.classList.remove('dark');
        document.documentElement.removeAttribute('data-role');
        await supabase.auth.signOut();
        navigate('/login');
    };

    const saveProfile = async () => {
        if (!user) return;
        setIsEditingProfile(false);
        await supabase.auth.updateUser({ data: { full_name: profileName } });
    };

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[60vh] text-slate-500">
            Cargando configuración...
        </div>
    );

    return (
        <div className="bg-[#fbfaff] dark:bg-[#191022] text-slate-900 dark:text-slate-100 min-h-screen pb-24 font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Header Navigation */}
            <header className="sticky top-0 z-50 bg-[#fbfaff]/80 dark:bg-[#191022]/80 backdrop-blur-md px-4 py-4 flex items-center justify-center border-b border-[#8c2bee]/10">
                <h1 className="text-lg font-bold tracking-tight">Configuración</h1>
            </header>

            <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
                {/* Parent Profile Section */}
                <section className="bg-white dark:bg-slate-900/50 p-4 rounded-xl ios-shadow border border-[#8c2bee]/5" style={{ boxShadow: '0 2px 12px -2px rgba(140, 43, 238, 0.08)' }}>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-[#8c2bee]/10 flex items-center justify-center overflow-hidden border-2 border-[#8c2bee]/20">
                                <span className="text-[#8c2bee] font-bold text-3xl">{profileName.charAt(0).toUpperCase()}</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            {isEditingProfile ? (
                                <input
                                    type="text"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 rounded text-xl font-bold leading-tight outline-none focus:ring-2 focus:ring-[#8c2bee]"
                                    autoFocus
                                />
                            ) : (
                                <h2 className="text-xl font-bold leading-tight">{profileName}</h2>
                            )}
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</p>
                        </div>
                        {isEditingProfile ? (
                            <button onClick={saveProfile} className="bg-[#8c2bee] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#8c2bee]/90 transition-colors">
                                Guardar
                            </button>
                        ) : (
                            <button onClick={() => setIsEditingProfile(true)} className="bg-[#8c2bee]/10 text-[#8c2bee] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#8c2bee]/20 transition-colors">
                                Editar
                            </button>
                        )}
                    </div>
                </section>

                {/* Baby Profile Management */}
                <section>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 mb-2 ml-1">Mi Familia</h3>
                    <div className="bg-white dark:bg-slate-900/50 rounded-xl ios-shadow border border-[#8c2bee]/5 overflow-hidden" style={{ boxShadow: '0 2px 12px -2px rgba(140, 43, 238, 0.08)' }}>
                        {babies.map((baby) => (
                            <div key={baby.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <div
                                    className="flex items-center p-4 gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                    onClick={() => toggleExpand(baby.id)}
                                >
                                    <div className="w-12 h-12 rounded-lg bg-[#a8e6cf]/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-green-600">child_care</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">Perfil de {baby.name || 'Bebé'}</p>
                                        <p className="text-xs text-slate-500">{baby.gender === 'niño' ? 'Niño' : baby.gender === 'niña' ? 'Niña' : 'Bebé'}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300">
                                        {baby.expanded ? 'expand_less' : 'chevron_right'}
                                    </span>
                                </div>
                                {baby.expanded && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/30 space-y-4">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Nombre</label>
                                            <input
                                                type="text"
                                                value={baby.name}
                                                onChange={e => updateBabyField(baby.id, 'name', e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#8c2bee] outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Fecha de Nacimiento</label>
                                                <input
                                                    type="date"
                                                    value={baby.birth_date}
                                                    max={today}
                                                    onChange={e => updateBabyField(baby.id, 'birth_date', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#8c2bee] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Género</label>
                                                <select
                                                    value={baby.gender}
                                                    onChange={e => updateBabyField(baby.id, 'gender', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#8c2bee] outline-none"
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    <option value="niña">Niña</option>
                                                    <option value="niño">Niño</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Peso (kg)</label>
                                                <input
                                                    type="number" step="0.01"
                                                    value={baby.weight}
                                                    onChange={e => updateBabyField(baby.id, 'weight', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#8c2bee] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Altura (cm)</label>
                                                <input
                                                    type="number" step="0.1"
                                                    value={baby.height}
                                                    onChange={e => updateBabyField(baby.id, 'height', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#8c2bee] outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => saveBaby(baby)}
                                                disabled={baby.saving}
                                                className="flex-1 bg-[#8c2bee] hover:bg-[#8c2bee]/90 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                                            >
                                                {baby.saving ? 'Guardando...' : baby.saved ? '¡Guardado con éxito!' : 'Guardar Datos'}
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm('¿Seguro que deseas eliminar el perfil de este bebé? Se borrarán todos sus datos.')) {
                                                        await dbHelpers.deleteBabyProfile(baby.id, user!.id);
                                                        fetchBabies();
                                                        window.dispatchEvent(new CustomEvent('luna-action-completed'));
                                                    }
                                                }}
                                                className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-2 rounded-lg text-sm transition-colors"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* AI Preferences */}
                <section>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 mb-2 ml-1">Ajustes de la App</h3>
                    <div className="bg-white dark:bg-slate-900/50 rounded-xl ios-shadow border border-[#8c2bee]/5 overflow-hidden" style={{ boxShadow: '0 2px 12px -2px rgba(140, 43, 238, 0.08)' }}>
                        {/* Night Mode Toggle */}
                        <div className="flex items-center p-4 gap-4 bg-[#8c2bee]/5 text-slate-900 dark:text-slate-100 justify-between">
                            <div>
                                <p className="font-semibold text-[#8c2bee]">Tema Visual</p>
                                <p className="text-[10px] text-[#8c2bee]/70">Modo día y noche animado</p>
                            </div>
                            <AnimatedThemeToggler className="w-12 h-12 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700" />
                        </div>
                    </div>
                </section>

                {/* Logout Button */}
                <div className="pt-4 pb-8">
                    <button
                        onClick={handleLogout}
                        className="w-full py-4 rounded-xl bg-[#ff8a8a]/10 text-red-500 font-bold hover:bg-[#ff8a8a]/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        Cerrar Sesión
                    </button>
                    <p className="text-center text-slate-400 text-xs mt-4">LunaCare v2.4.0 • Hecho con amor para padres</p>
                </div>
            </main>
        </div>
    );
}
