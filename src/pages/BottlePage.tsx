import { useState, useEffect } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { useBabies } from '../hooks/useBabies';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function BottlePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedBaby } = useBabies();

    const [amount, setAmount] = useState(120); // default to 120ml
    const [contentType, setContentType] = useState<'breastmilk' | 'formula'>('formula');
    const [temperature, setTemperature] = useState<'Frío' | 'Ambiente' | 'Tibio'>('Ambiente');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Insight from AI
    const [insightText, setInsightText] = useState('Analizando registros de biberón...');
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');

    useEffect(() => {
        const handleSync = () => setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        window.addEventListener('luna-settings-updated', handleSync);
        return () => window.removeEventListener('luna-settings-updated', handleSync);
    }, []);

    const fetchInsight = useCallback(async (babyId: string) => {
        setInsightText('Analizando registros de biberón...');
        const { data } = await dbHelpers.getDiets(babyId);
        if (data) {
            const todayBottles = data.filter((d: any) =>
                (d.type === 'bottle_formula' || d.type === 'bottle_breastmilk') &&
                new Date(d.created_at || "").toDateString() === new Date().toDateString()
            );

            const totalMl = todayBottles.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

            const context = `El bebé ha tomado ${totalMl}ml en biberón hoy.`;
            const { geminiHelpers } = await import('../lib/gemini');
            const prompt = `Da un consejo MUY CORTO (1 línea) empático sobre alimentación con biberón. Menciona que ha tomado ${totalMl}ml hoy. NO uses negritas ni markdown.`;
            const res = await geminiHelpers.sendMessageWithContext(prompt, [{ role: 'user' as const, parts: [{ text: prompt }] }], context);
            if (res.text) setInsightText(res.text);
        }
    }, []);

    useEffect(() => {
        if (selectedBaby) {
            fetchInsight(selectedBaby.id);
            // Reset form when baby changes
            setAmount(120);
            setContentType('formula');
            setTemperature('Ambiente');
            setNotes('');
        }
    }, [selectedBaby, fetchInsight]);

    const handleSave = async () => {
        if (!user || !selectedBaby || amount <= 0) return;
        setLoading(true);

        const typeStr = contentType === 'formula' ? 'bottle_formula' : 'bottle_breastmilk';
        const finalNotes = `Contenido: ${contentType === 'formula' ? 'Fórmula' : 'Leche Materna'}, Temperatura: ${temperature}. ${notes}`.trim();

        const { error } = await dbHelpers.insertDiet({
            type: typeStr,
            amount,
            observations: finalNotes,
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

    const increaseAmount = () => setAmount(prev => Math.min(prev + 30, 300));
    const decreaseAmount = () => setAmount(prev => Math.max(prev - 30, 0));

    // Calculate height percentage for animation (max 240ml realistically for visual, but allow up to 300ml)
    const liquidHeight = Math.min((amount / 240) * 100, 100);

    return (
        <div className="bg-background-light dark:bg-[#121212] text-slate-800 dark:text-slate-100 min-h-[max(884px,100dvh)] font-display pb-36 font-['Quicksand'] relative">
            <style>
                {`
                    .bottle-container {
                        height: 320px;
                        width: 140px;
                        position: relative;
                        background: rgba(255, 255, 255, 0.6);
                        border: 4px solid #E2E8F0;
                        border-radius: 40px 40px 60px 60px;
                        overflow: hidden;
                        margin: 0 auto;
                    }
                    .dark .bottle-container {
                        background: rgba(30, 41, 59, 0.6);
                        border-color: #334155;
                    }
                    .bottle-liquid {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: ${contentType === 'formula' ? 'linear-gradient(to top, #FFF9C4, #FFFDE7)' : 'linear-gradient(to top, #FFE0B2, #FFF3E0)'};
                        transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.5s ease;
                    }
                    .dark .bottle-liquid {
                        background: ${contentType === 'formula' ? 'linear-gradient(to top, #FBC02D, #FFF59D)' : 'linear-gradient(to top, #FFB74D, #FFE0B2)'};
                    }
                    .bottle-markings {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        padding: 40px 10px;
                        z-index: 10;
                        pointer-events: none;
                    }
                    .marking {
                        border-bottom: 2px solid rgba(0,0,0,0.1);
                        width: 30%;
                        display: flex;
                        align-items: center;
                    }
                    .dark .marking {
                        border-bottom-color: rgba(255,255,255,0.1);
                    }
                    .marking::after {
                        content: attr(data-ml);
                        font-size: 10px;
                        font-weight: 700;
                        color: rgba(0,0,0,0.3);
                        margin-left: 10px;
                    }
                    .dark .marking::after {
                        color: rgba(255,255,255,0.3);
                    }
                `}
            </style>

            <header className="fixed top-0 w-full z-50 bg-background-light/80 dark:bg-[#121212]/80 ios-blur px-6 pt-12 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">chevron_left</span>
                </button>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">Registro de Biberón</h1>
                <div className="w-10"></div>
            </header>

            <main className="pt-32 pb-12 px-5 max-w-md mx-auto animate-fade-in relative z-10">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-slate-800 dark:to-indigo-950 p-4 mb-8 border border-white/50 dark:border-white/10 shadow-sm">
                    <div className="flex items-center space-x-3 relative z-10">
                        <div className="relative flex-shrink-0">
                            <img alt="Luna AI" className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 object-cover" src={lunaIcon} />
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-0.5 rounded-full shadow-sm">
                                <span className="material-symbols-rounded text-primary text-xs">auto_awesome</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                                <span className="font-bold">{selectedBaby?.name}</span> {insightText.startsWith(selectedBaby?.name || '') ? insightText.replace(selectedBaby?.name || '', '') : insightText}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center mb-8">
                    <div className="flex space-x-4 mb-6">
                        <button className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-sm">ml</button>
                        <button className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed">oz</button>
                    </div>

                    <div className="relative">
                        <div className="bottle-container shadow-inner">
                            <div className="bottle-liquid" style={{ height: `${liquidHeight}%` }}></div>
                            <div className="bottle-markings">
                                <div className="marking" data-ml="240"></div>
                                <div className="marking" data-ml="180"></div>
                                <div className="marking" data-ml="120"></div>
                                <div className="marking" data-ml="60"></div>
                            </div>
                        </div>

                        {/* Controls Next To Bottle */}
                        <div className="absolute -right-24 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-4">
                            <button onClick={increaseAmount} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow flex justify-center items-center active:scale-95 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                                <span className="material-symbols-rounded">add</span>
                            </button>

                            <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex flex-col items-center min-w-[80px]">
                                <span className="text-2xl font-bold text-primary">{Math.round(amount)}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">ml</span>
                            </div>

                            <button onClick={decreaseAmount} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full shadow flex justify-center items-center active:scale-95 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                                <span className="material-symbols-rounded">remove</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex space-x-3 mt-8">
                        {[60, 120, 180, 240].map(val => (
                            <button
                                key={val}
                                onClick={() => setAmount(val)}
                                className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors active:scale-95 ${amount === val ? 'bg-primary text-white shadow-md border border-primary' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                            >
                                {val}ml
                            </button>
                        ))}
                    </div>
                </div >

                <div className="mb-8">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block tracking-wider">Contenido</label>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
                        <button
                            onClick={() => setContentType('breastmilk')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${contentType === 'breastmilk' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-400'}`}
                        >
                            Leche Materna
                        </button>
                        <button
                            onClick={() => setContentType('formula')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${contentType === 'formula' ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-400'}`}
                        >
                            Fórmula
                        </button>
                    </div >
                </div >

                <div className="mb-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block tracking-wider">Temperatura</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['Frío', 'Ambiente', 'Tibio'].map((temp) => (
                            <button
                                key={temp}
                                onClick={() => setTemperature(temp as any)}
                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${temperature === temp ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-white dark:bg-slate-800 text-slate-500 shadow-sm border-slate-100 dark:border-slate-700'}`}
                            >
                                <span className={`material-symbols-rounded mb-1 ${temperature === temp ? 'text-primary' : temp === 'Frío' ? 'text-blue-400' : temp === 'Tibio' ? 'text-orange-400' : 'text-slate-400'}`}>
                                    {temp === 'Frío' ? 'ac_unit' : temp === 'Ambiente' ? 'device_thermostat' : 'local_fire_department'}
                                </span>
                                <span className="text-xs font-bold">{temp}</span>
                            </button>
                        ))
                        }
                    </div >
                </div >

                <div className="mb-10">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block tracking-wider">Notas</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm focus:ring-primary focus:border-primary min-h-[100px] outline-none"
                        placeholder="¿Algo que destacar?">
                    </textarea>
                </div>
            </main >

            <div className="fixed bottom-0 w-full bg-white/90 dark:bg-slate-900/90 ios-blur px-6 pt-4 pb-10 border-t border-slate-100 dark:border-slate-800 z-50">
                <button
                    onClick={handleSave}
                    disabled={loading || amount <= 0}
                    className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform">
                    {loading ? 'Guardando...' : 'Guardar Registro'}
                </button>
            </div>
        </div >
    );
}
