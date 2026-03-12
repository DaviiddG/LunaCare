import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dbHelpers } from '../lib/db';
import { supabase } from '../lib/supabase';

const GOALS = [
    { id: 'sleep', label: 'Mejorar el sueño', icon: 'bedtime' },
    { id: 'feeding', label: 'Seguimiento de alimentación', icon: 'restaurant' },
    { id: 'motor', label: 'Desarrollo motriz', icon: 'fitness_center' },
];

export function AddBabyPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [goals, setGoals] = useState<string[]>(['sleep']);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleGoal = (id: string) => {
        setGoals(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !birthDate) {
            setError('El nombre y la fecha de nacimiento son obligatorios.');
            return;
        }
        if (!user) return;
        setSaving(true);
        setError(null);
        try {
            let avatar_url = '';

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                avatar_url = publicUrl;
            }

            await dbHelpers.upsertBabyProfile({
                user_id: user.id,
                name: name.trim(),
                birth_date: birthDate,
                weight: weight ? parseFloat(weight) : 0,
                height: height ? parseFloat(height) : 0,
                gender,
                avatar_url,
            });
            // Trigger refresh across the app
            window.dispatchEvent(new Event('luna-action-completed'));
            navigate(-1);
        } catch (err: any) {
            setError(err?.message || 'Error al guardar. Intenta de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCFE] dark:bg-[#121212] pb-32">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-[#FDFCFE]/80 dark:bg-[#121212]/80 backdrop-blur-xl px-4 pt-12 pb-4">
                <div className="flex items-center max-w-md mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">chevron_left</span>
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg text-slate-800 dark:text-white mr-10">
                        Añadir Bebé
                    </h1>
                </div>
            </header>

            <main className="pt-32 px-5 pb-32 max-w-md mx-auto">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-md flex items-center justify-center overflow-hidden cursor-pointer"
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-rounded text-slate-300 text-5xl">person</span>
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 bg-primary text-white w-9 h-9 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                        >
                            <span className="material-symbols-rounded text-base">add</span>
                        </button>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 text-sm font-semibold text-primary"
                    >
                        Subir foto
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-4 mb-8">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                            Nombre del bebé
                        </label>
                        <input
                            type="text"
                            placeholder="Ej. Leo"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 rounded-2xl px-4 py-4 text-slate-700 dark:text-slate-200 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                        />
                    </div>

                    {/* Birth date */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                            Fecha de nacimiento
                        </label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={e => setBirthDate(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 rounded-2xl px-4 py-4 text-slate-700 dark:text-slate-200 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                        />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                            Género
                        </label>
                        <div className="relative">
                            <select
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 rounded-2xl px-4 py-4 text-slate-700 dark:text-slate-200 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all appearance-none"
                            >
                                <option value="" disabled>Seleccionar género</option>
                                <option value="niño">Niño</option>
                                <option value="niña">Niña</option>
                                <option value="otro">Otro / Prefiero no decir</option>
                            </select>
                            <span className="material-symbols-rounded absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                expand_more
                            </span>
                        </div>
                    </div>

                    {/* Weight + Height */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                                Peso
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="0.0"
                                    value={weight}
                                    onChange={e => setWeight(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 rounded-2xl px-4 py-4 pr-12 text-slate-700 dark:text-slate-200 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                    kg
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                                Altura
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={height}
                                    onChange={e => setHeight(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 rounded-2xl px-4 py-4 pr-12 text-slate-700 dark:text-slate-200 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                    cm
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Luna AI greeting */}
                <div className="flex items-start space-x-3 bg-indigo-50/70 dark:bg-slate-800/50 p-4 rounded-2xl border border-indigo-100/50 dark:border-slate-700 mb-8">
                    <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-white dark:border-slate-600">
                            <span className="material-symbols-rounded text-primary text-2xl">auto_awesome</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-primary p-0.5 rounded-full">
                            <span className="material-symbols-rounded text-white text-[10px]">star</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-primary mb-1">Luna AI</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            ¡Hola! Cuéntame un poco sobre tu pequeño para que pueda darte los mejores consejos.
                        </p>
                    </div>
                </div>

                {/* Goals */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 ml-1">
                        Objetivos de Luna
                    </h3>
                    <div className="space-y-3">
                        {GOALS.map(goal => {
                            const active = goals.includes(goal.id);
                            return (
                                <button
                                    key={goal.id}
                                    onClick={() => toggleGoal(goal.id)}
                                    className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm transition-all active:scale-[0.98] border ${active
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                        : 'border-slate-100 dark:border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className={`material-symbols-rounded ${active ? 'text-primary' : 'text-slate-400'}`}>
                                            {goal.icon}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            {goal.label}
                                        </span>
                                    </div>
                                    {/* Toggle switch */}
                                    <div className={`w-10 h-5 rounded-full transition-colors relative ${active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${active ? 'right-1' : 'left-1'}`} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Save button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-primary py-5 rounded-2xl text-white font-bold text-base shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                    {saving ? 'Guardando...' : 'Crear Perfil'}
                </button>
            </main>
        </div>
    );
}
