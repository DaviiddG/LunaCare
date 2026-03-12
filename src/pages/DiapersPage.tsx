import { useState, useEffect } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { useBabies } from '../hooks/useBabies';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function DiapersPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedBaby } = useBabies();

    // Status states
    const [diaperType, setDiaperType] = useState<'Pipi' | 'Popo' | null>(null);
    const [consistency, setConsistency] = useState<'Normal' | 'Líquida' | 'Dura' | null>(null);
    const [color, setColor] = useState<'Amarillo' | 'Marrón' | 'Verde' | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Insight from AI
    const [insightText, setInsightText] = useState('Analizando pañales hoy...');
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');

    useEffect(() => {
        const handleSync = () => setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        window.addEventListener('luna-settings-updated', handleSync);
        return () => window.removeEventListener('luna-settings-updated', handleSync);
    }, []);

    const fetchInsight = useCallback(async (babyId: string) => {
        setInsightText('Analizando pañales hoy...');
        const { data } = await dbHelpers.getDiapers(babyId);
        if (data) {
            const todayCount = data.filter((d: any) => new Date(d.created_at).toDateString() === new Date().toDateString()).length;
            const context = `El bebé tiene ${todayCount} pañales registrados hoy.`;
            const { geminiHelpers } = await import('../lib/gemini');
            const prompt = `Da un consejo MUY CORTO (1 línea) de pediatra sobre la frecuencia de pañales (van ${todayCount} hoy), con tono empático.`;
            const res = await geminiHelpers.sendMessageWithContext(prompt, [{ role: 'user' as const, parts: [{ text: prompt }] }], context);
            if (res.text) setInsightText(res.text);
        }
    }, []);

    useEffect(() => {
        if (selectedBaby) {
            fetchInsight(selectedBaby.id);
            // Reset form when baby changes
            setDiaperType(null);
            setConsistency(null);
            setColor(null);
            setNotes('');
        }
    }, [selectedBaby, fetchInsight]);

    const handleSave = async () => {
        if (!user || !selectedBaby || !diaperType) return;
        setLoading(true);

        let fullStatus = diaperType;
        if (diaperType === 'Popo') {
            const extras: string[] = [];
            if (consistency) extras.push(consistency);
            if (color) extras.push(color);
            if (extras.length > 0) fullStatus += ` (${extras.join(', ')})`;
        }

        const { error } = await dbHelpers.insertDiaper({
            status: fullStatus,
            observations: notes,
            user_id: user.id,
            baby_id: selectedBaby.id
        });

        if (!error) {
            window.dispatchEvent(new CustomEvent('luna-action-completed'));
            navigate('/');
        } else {
            alert('Error al guardar: ' + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="bg-background-light dark:bg-[#121212] text-slate-800 dark:text-slate-100 min-h-screen font-display pb-36 font-['Quicksand'] relative">
            <header className="fixed top-0 w-full z-50 bg-background-light/80 dark:bg-[#121212]/80 ios-blur px-6 pt-12 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">chevron_left</span>
                </button>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">Registro de Pañal</h1>
                <div className="w-10"></div>
            </header>

            <main className="pt-32 px-5 space-y-6 animate-fade-in relative z-10">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-slate-800 dark:to-indigo-950 p-5 border border-white/50 dark:border-white/10 shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="relative flex-shrink-0">
                            <img alt="Luna AI" className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 object-cover" src={lunaIcon} />
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-md">
                                <span className="material-symbols-rounded text-primary text-xs leading-none">auto_awesome</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Luna AI Insight</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-tight">
                                <span className="font-bold">{selectedBaby?.name}</span> {insightText.startsWith(selectedBaby?.name || '') ? insightText.replace(selectedBaby?.name || '', '') : insightText}
                            </p>
                        </div>
                    </div>
                </div>

                <section>
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 px-1 tracking-wider uppercase">Tipo de pañal</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setDiaperType('Pipi')}
                            className={`flex flex-col items-center justify-center py-6 px-4 rounded-2xl border-2 active:scale-[0.98] transition-all min-h-[120px] ${diaperType === 'Pipi' ? 'bg-blue-100 border-blue-400 dark:bg-blue-900/40' : 'bg-[#E3F2FD] dark:bg-blue-900/20 border-transparent hover:border-blue-400/30'}`}>
                            <span className="material-symbols-rounded text-blue-500 text-4xl mb-2">water_drop</span>
                            <span className="font-bold text-blue-700 dark:text-blue-300">Pipi</span>
                        </button>
                        <button
                            onClick={() => setDiaperType('Popo')}
                            className={`flex flex-col items-center justify-center py-6 px-4 rounded-2xl border-2 active:scale-[0.98] transition-all min-h-[120px] ${diaperType === 'Popo' ? 'bg-amber-100 border-amber-500 dark:bg-amber-900/40' : 'bg-[#F5E6D3] dark:bg-amber-900/20 border-transparent hover:border-amber-600/30'}`}>
                            <span className="material-symbols-rounded text-amber-700 dark:text-amber-500 text-4xl mb-2">cookie</span>
                            <span className="font-bold text-amber-800 dark:text-amber-400">Popo</span>
                        </button>
                    </div>
                </section>

                {diaperType === 'Popo' && (
                    <>
                        <section className="animate-fade-in">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 px-1 tracking-wider uppercase">Consistencia</h3>
                            <div className="flex justify-between bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                {['Normal', 'Líquida', 'Dura'].map(cons => (
                                    <button
                                        key={cons}
                                        onClick={() => setConsistency(cons as any)}
                                        className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-colors ${consistency === cons ? 'bg-slate-100 dark:bg-slate-700 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-400'}`}>
                                        <span className={`material-symbols-rounded mb-1 ${consistency === cons ? 'text-primary' : 'text-slate-400'}`}>
                                            {cons === 'Normal' ? 'sentiment_satisfied' : cons === 'Líquida' ? 'waves' : 'circle'}
                                        </span>
                                        <span className={`text-xs font-semibold ${consistency === cons ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>{cons}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="animate-fade-in">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 px-1 tracking-wider uppercase">Color</h3>
                            <div className="flex items-center space-x-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                {[
                                    { id: 'Amarillo', hex: '#FFD54F' },
                                    { id: 'Marrón', hex: '#8D6E63' },
                                    { id: 'Verde', hex: '#9CCC65' }
                                ].map(c => (
                                    <div key={c.id} className="flex flex-col items-center space-y-2">
                                        <button
                                            onClick={() => setColor(c.id as any)}
                                            style={{ backgroundColor: c.hex }}
                                            className={`w-10 h-10 rounded-full border-4 border-white dark:border-slate-700 shadow-sm ring-2 ${color === c.id ? 'ring-primary' : 'ring-transparent'} hover:ring-primary transition-all`}></button>
                                        <span className="text-[10px] font-medium text-slate-500">{c.id}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}

                <section>
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 px-1 tracking-wider uppercase">Notas</h3>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm focus:ring-primary focus:border-primary min-h-[100px] shadow-sm outline-none"
                        placeholder="Añade algún detalle adicional..." />
                </section>
            </main>

            <div className="fixed bottom-0 w-full bg-white/90 dark:bg-slate-900/90 ios-blur px-6 pt-4 pb-10 border-t border-slate-100 dark:border-slate-800 z-50">
                <button
                    onClick={handleSave}
                    disabled={!diaperType || loading}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                    {loading ? 'Guardando...' : 'Guardar Registro'}
                </button>
            </div>
        </div>
    );
}
