import { useState, useEffect, useRef } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useBabies } from '../hooks/useBabies';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

function useTimer(startTime: Date | null) {
    const [elapsed, setElapsed] = useState('00:00:00');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (startTime) {
            const update = () => {
                const diff = Date.now() - startTime.getTime();
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
            };
            update();
            intervalRef.current = setInterval(update, 1000);
        } else {
            setElapsed('00:00:00');
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [startTime]);

    return elapsed;
}

export function SleepPage() {
    const { user } = useAuth();
    const { selectedBaby } = useBabies();
    const navigate = useNavigate();

    const [isSleeping, setIsSleeping] = useState(false);
    const [sleepType, setSleepType] = useState<'siesta' | 'nocturno'>('nocturno');
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);
    const [insightText, setInsightText] = useState('Analizando registros de sueño...');

    // Manual entry
    const [manualStart, setManualStart] = useState('');
    const [manualEnd, setManualEnd] = useState('');
    const [notes, setNotes] = useState('');
    const [manualLoading, setManualLoading] = useState(false);
    const [manualSaved, setManualSaved] = useState(false);

    const elapsed = useTimer(startTime);

    useEffect(() => {
        // Always reset timer state first when baby changes
        setIsSleeping(false);
        setStartTime(null);

        if (selectedBaby) {
            // Check if THIS baby specifically has an active sleep session
            const savedStart = localStorage.getItem(`sleep_start_${selectedBaby.id}`);
            if (savedStart) {
                setStartTime(new Date(savedStart));
                setIsSleeping(true);
            }
            fetchInsight();
        }
    }, [selectedBaby?.id]);

    const fetchInsight = async () => {
        if (!selectedBaby) return;
        setInsightText('Analizando registros de sueño...');
        const { data } = await dbHelpers.getSleepLogs(selectedBaby.id);
        if (data && data.length > 0) {
            const today = new Date();
            const todayLogs = data.filter((log: any) => {
                const d = new Date(log.created_at || log.start_time);
                return d.toDateString() === today.toDateString();
            });
            const totalMs = todayLogs.reduce((acc: number, log: any) => {
                if (!log.start_time || !log.end_time) return acc;
                return acc + (new Date(log.end_time).getTime() - new Date(log.start_time).getTime());
            }, 0);
            const totalHours = Math.round(totalMs / 3600000 * 10) / 10;
            const { geminiHelpers } = await import('../lib/gemini');
            const context = `${selectedBaby.name} ha dormido ${totalHours} horas hoy en total.`;
            const prompt = `Con la siguiente info: "${context}", da un consejo MUY CORTO (1-2 frases) y amigable sobre el sueño del bebé. NO uses negritas ni markdown.`;
            const res = await geminiHelpers.sendMessageWithContext(prompt, [], context);
            if (res.text) setInsightText(res.text.replace(/\*/g, ''));
        } else {
            setInsightText('Registra el primer sueño de hoy y Luna te dará consejos personalizados.');
        }
    };

    const handleToggleSleep = async () => {
        if (!user || !selectedBaby) return;

        if (!isSleeping) {
            const now = new Date();
            setStartTime(now);
            setIsSleeping(true);
            localStorage.setItem(`sleep_start_${selectedBaby.id}`, now.toISOString());
        } else {
            setLoading(true);
            const endTime = new Date();
            const start = startTime || new Date();
            const diffMs = endTime.getTime() - start.getTime();
            const diffMins = Math.round(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            const durationStr = `${hours}h ${mins}m`;

            const { error } = await dbHelpers.insertSleepLog({
                start_time: start.toISOString(),
                end_time: endTime.toISOString(),
                duration: durationStr,
                user_id: user.id,
                baby_id: selectedBaby.id,
            });

            if (!error) {
                setIsSleeping(false);
                setStartTime(null);
                localStorage.removeItem(`sleep_start_${selectedBaby.id}`);
                fetchInsight();
                window.dispatchEvent(new CustomEvent('luna-action-completed'));
            }
            setLoading(false);
        }
    };

    const handleManualSave = async () => {
        if (!user || !selectedBaby || !manualStart || !manualEnd) return;
        setManualLoading(true);

        const today = format(new Date(), 'yyyy-MM-dd');
        const startISO = `${today}T${manualStart}:00`;
        const endISO = `${today}T${manualEnd}:00`;
        const diffMs = new Date(endISO).getTime() - new Date(startISO).getTime();
        if (diffMs <= 0) { setManualLoading(false); return; }
        const diffMins = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        const durationStr = `${hours}h ${mins}m`;

        const { error } = await dbHelpers.insertSleepLog({
            start_time: startISO,
            end_time: endISO,
            duration: durationStr,
            user_id: user.id,
            baby_id: selectedBaby.id,
        });

        if (!error) {
            setManualSaved(true);
            setManualStart('');
            setManualEnd('');
            setNotes('');
            fetchInsight();
            window.dispatchEvent(new CustomEvent('luna-action-completed'));
            setTimeout(() => setManualSaved(false), 2000);
        }
        setManualLoading(false);
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#101922] min-h-screen pb-28 font-['Manrope',sans-serif] text-slate-900 dark:text-slate-100">

            {/* Top Bar */}
            <div className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-[#f6f7f8]/80 dark:bg-[#101922]/80 backdrop-blur-md z-10">
                <button
                    onClick={() => navigate('/')}
                    className="flex size-10 shrink-0 items-center justify-center cursor-pointer rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">arrow_back_ios</span>
                </button>
                <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Registro de Sueño</h2>
            </div>

            {/* Luna AI Insight Card */}
            <div className="px-4 pt-2 pb-2">
                <div className="flex flex-col items-stretch rounded-2xl shadow-sm bg-white dark:bg-slate-800 border border-[#3994ef]/10 overflow-hidden">
                    <div className="flex items-center gap-4 p-4">
                        <div className="size-12 shrink-0 rounded-full bg-[#3994ef]/10 flex items-center justify-center border-2 border-[#3994ef]/20 overflow-hidden">
                            <span className="material-symbols-outlined text-[#3994ef] text-2xl">smart_toy</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-[#3994ef] text-xs font-bold uppercase tracking-wider">Luna AI</p>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{insightText}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timer / Circular Control Section */}
            <div className="flex flex-col items-center py-8 px-4">
                <div className="relative flex items-center justify-center size-60 mb-8">
                    {/* Circular Track */}
                    <div className="absolute inset-0 rounded-full border-8 border-[#3994ef]/10"></div>
                    {/* Circular Progress (animated when sleeping) */}
                    {isSleeping ? (
                        <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-[#3994ef] border-r-[#3994ef] rotate-45 animate-spin" style={{ animationDuration: '3s' }}></div>
                    ) : (
                        <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-[#9d8cf2] border-r-[#9d8cf2] rotate-45"></div>
                    )}
                    <div className="flex flex-col items-center gap-1 z-10">
                        <span className="text-4xl font-extrabold tracking-tight tabular-nums">{elapsed}</span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                            {isSleeping ? 'Durmiendo...' : 'Tiempo dormido'}
                        </span>
                        {startTime && (
                            <span className="text-[11px] text-slate-400 mt-1">Desde las {format(startTime, 'HH:mm')}</span>
                        )}
                    </div>
                </div>

                {/* Main Toggle Button */}
                <button
                    onClick={handleToggleSleep}
                    disabled={loading || !selectedBaby}
                    className={`flex min-w-[200px] cursor-pointer items-center justify-center rounded-full h-14 px-8 text-white text-base font-bold shadow-lg active:scale-95 transition-all duration-300 ${isSleeping
                        ? 'bg-orange-400 shadow-orange-300/40'
                        : 'bg-[#3994ef] shadow-[#3994ef]/30'
                        } disabled:opacity-50`}
                >
                    <span className="material-symbols-outlined mr-2 text-xl">
                        {isSleeping ? 'wb_sunny' : 'bedtime'}
                    </span>
                    <span>{loading ? 'Guardando...' : isSleeping ? 'Despertar' : '¡A dormir!'}</span>
                </button>
            </div>

            {/* Quick Actions: Sleep Type */}
            <div className="flex justify-center gap-4 px-4 py-2">
                <button
                    onClick={() => setSleepType('siesta')}
                    className={`flex flex-1 items-center justify-center rounded-xl h-12 text-sm font-bold border transition-colors ${sleepType === 'siesta'
                        ? 'bg-[#3994ef] text-white border-[#3994ef]'
                        : 'bg-[#3994ef]/10 text-[#3994ef] border-[#3994ef]/20'
                        }`}
                >
                    <span className="material-symbols-outlined text-sm mr-2">wb_sunny</span>
                    Siesta
                </button>
                <button
                    onClick={() => setSleepType('nocturno')}
                    className={`flex flex-1 items-center justify-center rounded-xl h-12 text-sm font-bold border transition-colors ${sleepType === 'nocturno'
                        ? 'bg-[#3994ef] text-white border-[#3994ef]'
                        : 'bg-[#3994ef]/10 text-[#3994ef] border-[#3994ef]/20'
                        }`}
                >
                    <span className="material-symbols-outlined text-sm mr-2">dark_mode</span>
                    Sueño Nocturno
                </button>
            </div>

            {/* Manual Entry Section */}
            <div className="p-4 mt-6">
                <h3 className="text-md font-bold mb-4 px-1">Registro Manual</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-500 px-1">Inicio</label>
                        <div className="flex h-14 items-center rounded-xl px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-xl">schedule</span>
                            <input
                                type="time"
                                value={manualStart}
                                onChange={e => setManualStart(e.target.value)}
                                className="flex-1 text-lg font-bold bg-transparent border-none outline-none text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-500 px-1">Fin</label>
                        <div className="flex h-14 items-center rounded-xl px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-xl">check_circle</span>
                            <input
                                type="time"
                                value={manualEnd}
                                onChange={e => setManualEnd(e.target.value)}
                                className="flex-1 text-lg font-bold bg-transparent border-none outline-none text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div className="px-4 pb-2">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-500 px-1">Notas</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#3994ef] outline-none resize-none text-sm"
                        placeholder="¿Cómo despertó hoy?"
                        rows={3}
                    />
                </div>
            </div>

            {/* Save Button */}
            <div className="px-4 mt-4 mb-6">
                <button
                    onClick={handleManualSave}
                    disabled={manualLoading || !manualStart || !manualEnd || !selectedBaby}
                    className="w-full flex cursor-pointer items-center justify-center rounded-xl h-14 bg-[#9d8cf2] text-white text-base font-bold shadow-lg shadow-[#9d8cf2]/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    <span className="material-symbols-outlined mr-2">save</span>
                    {manualSaved ? '¡Guardado!' : manualLoading ? 'Guardando...' : 'Guardar Registro'}
                </button>
            </div>
        </div>
    );
}
