import { useState, useEffect } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useBabies } from '../hooks/useBabies';
import { useNavigate } from 'react-router-dom';

export function DietPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedBaby } = useBabies();

    // Timer States
    const [leftTime, setLeftTime] = useState(0); // in seconds
    const [rightTime, setRightTime] = useState(0); // in seconds
    const [activeTimer, setActiveTimer] = useState<'left' | 'right' | null>(null);
    const [isManual, setIsManual] = useState(false);

    // Form States
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Insight from AI
    const [insightText, setInsightText] = useState('Analizando rutinas de lactancia...');

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (activeTimer === 'left') {
            interval = setInterval(() => setLeftTime(t => t + 1), 1000);
        } else if (activeTimer === 'right') {
            interval = setInterval(() => setRightTime(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [activeTimer]);

    // Format seconds to MM:SS
    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Total time
    const totalTime = leftTime + rightTime;

    // Toggle timer
    const toggleTimer = (side: 'left' | 'right') => {
        if (isManual) return; // Disables clicking the circle directly to start/stop if manual
        if (activeTimer === side) {
            setActiveTimer(null); // Stop
        } else {
            setActiveTimer(side); // Start new, stop other
        }
    };

    const handleManualChange = (side: 'left' | 'right', minutes: string) => {
        const mins = parseInt(minutes) || 0;
        if (side === 'left') setLeftTime(mins * 60);
        if (side === 'right') setRightTime(mins * 60);
    };

    useEffect(() => {
        if (selectedBaby) {
            fetchInsight(selectedBaby.id);
            // Reset form when baby changes
            setActiveTimer(null);
            setLeftTime(0);
            setRightTime(0);
            setNotes('');
        }
    }, [selectedBaby]);

    const fetchInsight = async (babyId: string) => {
        setInsightText('Analizando rutinas de lactancia...');
        const { data } = await dbHelpers.getDiets(babyId);
        if (data) {
            const breastDiets = data.filter((d: any) => d.type === 'breast');
            const count = breastDiets.length;
            const context = count > 0
                ? `El bebé ha tomado pecho ${count} veces registradas. La última fue hace poco.`
                : 'No hay registros previos de pecho.';

            const { geminiHelpers } = await import('../lib/gemini');
            const prompt = `Da un consejo MUY CORTO (1 línea) empático sobre lactancia para el bebé ${selectedBaby?.name}. Menciona un tip de apego o de producción de leche. NO uses negritas ni markdown.`;
            const res = await geminiHelpers.sendMessageWithContext(prompt, [{ role: 'user' as const, parts: [{ text: prompt }] }], context);
            if (res.text) setInsightText(res.text);
        }
    };

    const handleSave = async () => {
        if (!user || !selectedBaby) return;
        if (totalTime === 0) {
            alert("El tiempo total no puede ser 0");
            return;
        }

        setLoading(true);
        setActiveTimer(null);

        const observations = `Izquierdo: ${formatTime(leftTime)}, Derecho: ${formatTime(rightTime)}. ${notes}`.trim();
        const amountMinutes = Math.round(totalTime / 60);

        const { error } = await dbHelpers.insertDiet({
            type: 'breast',
            amount: amountMinutes,
            observations: observations,
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
        <div className="bg-background-light dark:bg-[#121212] text-slate-800 dark:text-slate-100 min-h-[max(884px,100dvh)] font-display pb-36 font-['Quicksand'] relative">
            <header className="fixed top-0 w-full z-50 bg-background-light/80 dark:bg-[#121212]/80 ios-blur px-6 pt-12 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">chevron_left</span>
                </button>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">Registro de Lactancia</h1>
                <div className="w-10"></div>
            </header>

            <main className="pt-32 px-6 pb-40 animate-fade-in relative z-10">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-slate-800 dark:to-indigo-950 p-5 mb-8 border border-white/50 dark:border-white/10 shadow-sm">
                    <div className="flex items-start space-x-4 relative z-10">
                        <div className="relative flex-shrink-0">
                            <img alt="Luna AI Avatar" className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBzp9ULmCSR-715iwzlJptbBIBpXKq50y-nSGTvw48EB1wAoxmZ876NSg9R0tVxdcMowmLHfu8WtoBBK7pyOg-FQIOcOLPpf2E21KVoZ9DH1zn9HPAWysFZENQBBPrcO2iPjxggME_fAuGsyWRVf7OcXV3HnvAkQH-b_PYcGdG3rKiG5_ilp6DqxISYIBCcSKVRrBDicw1kR-PaA1CEOk6ONjhxKdy275OeXOU12pRgB8EGcmoiZPyk5lSYpB7G3TBzYcXZzBIrvmY" />
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-0.5 rounded-full shadow-sm">
                                <span className="material-symbols-rounded text-primary text-xs">auto_awesome</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Luna AI</h3>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                <span className="font-bold">{selectedBaby?.name}</span> {insightText.startsWith(selectedBaby?.name || '') ? insightText.replace(selectedBaby?.name || '', '') : insightText}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center mb-10">
                    <div className="flex justify-between w-full max-w-xs mb-8">
                        {/* LEFT BREAST */}
                        <div className="flex flex-col items-center space-y-3">
                            <button
                                onClick={() => toggleTimer('left')}
                                className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-transform ${activeTimer === 'left' ? 'bg-peach border-peach/80 scale-105 shadow-lg shadow-peach/40' : 'bg-peach/40 dark:bg-peach/20 border-4 border-peach/60 active:scale-95'}`}
                            >
                                <span className={`material-symbols-rounded text-4xl mb-1 ${activeTimer === 'left' ? 'text-white' : 'text-orange-400'}`}>
                                    {activeTimer === 'left' ? 'pause_circle' : isManual ? 'edit' : 'play_circle'}
                                </span>

                                {isManual ? (
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        onChange={(e) => handleManualChange('left', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-16 bg-white/50 dark:bg-black/20 text-center font-bold text-orange-700 dark:text-orange-200 rounded p-1 text-sm outline-none"
                                    />
                                ) : (
                                    <span className={`text-lg font-bold ${activeTimer === 'left' ? 'text-white' : 'text-orange-600 dark:text-orange-300'}`}>
                                        {formatTime(leftTime)}
                                    </span>
                                )}
                            </button>
                            <span className="font-bold text-slate-600 dark:text-slate-400">Izquierdo</span>
                        </div>

                        {/* RIGHT BREAST */}
                        <div className="flex flex-col items-center space-y-3">
                            <button
                                onClick={() => toggleTimer('right')}
                                className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-transform ${activeTimer === 'right' ? 'bg-mint border-mint/80 scale-105 shadow-lg shadow-mint/40' : 'bg-mint/40 dark:bg-mint/20 border-4 border-mint/60 active:scale-95'}`}
                            >
                                <span className={`material-symbols-rounded text-4xl mb-1 ${activeTimer === 'right' ? 'text-white' : 'text-emerald-400'}`}>
                                    {activeTimer === 'right' ? 'pause_circle' : isManual ? 'edit' : 'play_circle'}
                                </span>

                                {isManual ? (
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        onChange={(e) => handleManualChange('right', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-16 bg-white/50 dark:bg-black/20 text-center font-bold text-emerald-700 dark:text-emerald-200 rounded p-1 text-sm outline-none"
                                    />
                                ) : (
                                    <span className={`text-lg font-bold ${activeTimer === 'right' ? 'text-white' : 'text-emerald-600 dark:text-emerald-300'}`}>
                                        {formatTime(rightTime)}
                                    </span>
                                )}
                            </button>
                            <span className="font-bold text-slate-600 dark:text-slate-400">Derecho</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 px-8 py-3 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 mb-6 flex items-center space-x-2">
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Total: </p>
                        <span className="text-primary font-bold text-xl">{formatTime(totalTime)}</span>
                    </div>

                    {/* TOGGLE MANUAL / TIMER */}
                    <div
                        className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-full border border-slate-100 dark:border-slate-700 cursor-pointer"
                        onClick={() => {
                            setIsManual(!isManual);
                            if (!isManual) setActiveTimer(null); // Pause if switching to manual
                        }}
                    >
                        <span className={`text-xs font-bold pl-2 ${!isManual ? 'text-primary' : 'text-slate-500'}`}>Cronómetro</span>
                        <div className={`w-10 h-6 rounded-full relative flex items-center px-1 transition-colors ${isManual ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isManual ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                        <span className={`text-xs font-bold pr-2 uppercase ${isManual ? 'text-primary' : 'text-slate-500'}`}>Manual</span>
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2 px-1">Notas</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm focus:ring-primary focus:border-primary min-h-[100px] shadow-sm outline-none"
                        placeholder="¿Alguna observación sobre la toma?">
                    </textarea>
                </div>
            </main>

            <div className="fixed bottom-0 w-full bg-white/90 dark:bg-slate-900/90 ios-blur px-6 pt-4 pb-10 border-t border-slate-100 dark:border-slate-800 z-50">
                <button
                    onClick={handleSave}
                    disabled={loading || totalTime === 0}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:active:scale-100 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                    {loading ? 'Guardando...' : 'Guardar Registro'}
                </button>
            </div>
        </div>
    );
}
