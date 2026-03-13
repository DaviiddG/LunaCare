import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { useBabies } from '../hooks/useBabies';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const FOODS = [
    { id: 'avocado', name: 'Aguacate', icon: '🥑' },
    { id: 'banana', name: 'Banano', icon: '🍌' },
    { id: 'apple', name: 'Manzana', icon: '🍎' },
    { id: 'rice_cereal', name: 'Cereal de arroz', icon: '🥣' },
    { id: 'sweet_potato', name: 'Batata', icon: '🍠' },
    { id: 'oatmeal', name: 'Avena', icon: '🌾' },
    { id: 'spinach', name: 'Espinaca', icon: '🥬' },
    { id: 'chicken', name: 'Pollo', icon: '🍗' },
    { id: 'peas', name: 'Arvejas', icon: '🫛' },
    { id: 'pear', name: 'Pera', icon: '🍐' },
    { id: 'yogurt', name: 'Yogurt', icon: '🥛' },
    { id: 'carrot', name: 'Zanahoria', icon: '🥕' },
    { id: 'broccoli', name: 'Brócoli', icon: '🥦' },
    { id: 'prune', name: 'Ciruela Pasa', icon: '🫐' },
    { id: 'green_bean', name: 'Habichuela', icon: '🫘' },
    { id: 'mango', name: 'Mango', icon: '🥭' },
    { id: 'egg', name: 'Huevo', icon: '🥚' },
    { id: 'strawberry', name: 'Fresa', icon: '🍓' },
    { id: 'pasta', name: 'Pasta', icon: '🍝' },
    { id: 'blueberry', name: 'Arándano', icon: '🫐' }
];

const NatureGradient = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#80ed99]/5 dark:bg-[#80ed99]/10 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-5%] left-[-10%] w-[50%] h-[50%] bg-[#ff9f1c]/5 dark:bg-[#ff9f1c]/10 blur-[100px] rounded-full animate-pulse" style={{ animationDuration: '15s' }} />
        <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-white dark:bg-white/5 blur-[80px] rounded-full" />
    </div>
);

export function SolidsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedBaby } = useBabies();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [lunaIcon, setLunaIcon] = useState(localStorage.getItem('luna_icon') || '/luna-avatar.png');

    useEffect(() => {
        const handleSync = () => setLunaIcon(localStorage.getItem('luna_icon') || '/luna-avatar.png');
        window.addEventListener('luna-settings-updated', handleSync);
        return () => window.removeEventListener('luna-settings-updated', handleSync);
    }, []);

    const filteredFoods = FOODS.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const toggleFood = (foodId: string) => {
        setSelectedFoods(prev =>
            prev.includes(foodId) ? prev.filter(id => id !== foodId) : [...prev, foodId]
        );
    };

    const handleSave = async () => {
        if (!user || !selectedBaby || selectedFoods.length === 0) return;
        setIsSaving(true);
        try {
            await dbHelpers.insertSolids({
                user_id: user.id,
                baby_id: selectedBaby.id,
                foods: selectedFoods.map(id => FOODS.find(f => f.id === id)?.name || id),
                amount: 'Varios',
                observations: 'Registrado desde la cuadrícula de sólidos premium'
            });
            navigate('/');
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="relative bg-[#F8FAFC] dark:bg-[#0A0C10] min-h-screen pb-32 font-['Manrope',sans-serif] text-slate-900 dark:text-white selection:bg-[#80ed99]/30 overflow-x-hidden">
            <NatureGradient />

            {/* Content Container */}
            <div className="relative z-10 max-w-lg mx-auto px-5">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center py-7 justify-between transition-all"
                >
                    <button
                        onClick={() => navigate('/')}
                        className="flex size-11 items-center justify-center rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl hover:bg-white/60 dark:hover:bg-white/10 active:scale-95 transition-all shadow-sm"
                    >
                        <span className="material-symbols-rounded text-slate-700 dark:text-white/70">close</span>
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d6a4f] dark:text-[#80ed99] mb-1">Huerta Natural</span>
                        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Agregar Sólidos</h2>
                    </div>
                    <button className="flex size-11 items-center justify-center rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl hover:bg-white/60 dark:hover:bg-white/10 active:scale-95 transition-all shadow-sm">
                        <span className="material-symbols-rounded text-slate-700 dark:text-white/70">history</span>
                    </button>
                </motion.div>

                {/* Premium Luna Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative mb-8"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#80ed99]/30 to-[#ff9f1c]/30 rounded-[2rem] blur-xl opacity-40 dark:opacity-20" />
                    <div className="relative p-5 rounded-[2rem] bg-white/60 dark:bg-white/[0.03] border border-white/40 dark:border-white/10 backdrop-blur-2xl overflow-hidden group shadow-xl shadow-slate-200/50 dark:shadow-none">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-symbols-rounded text-6xl">spa</span>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="size-14 shrink-0 rounded-2xl border-2 border-white/40 dark:border-white/10 overflow-hidden shadow-lg relative">
                                <img src={lunaIcon} alt="Luna AI" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#2d6a4f] dark:text-[#80ed99]">Luna AI</span>
                                <p className="text-sm font-bold leading-relaxed text-slate-900 dark:text-white/80">
                                    {selectedBaby?.name ? `¡Hora de probar nuevos sabores con ${selectedBaby.name}! ✨` : '¡Hora de probar nuevos sabores! ✨'}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Search Bar */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative mb-10"
                >
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/40">
                        <span className="material-symbols-rounded">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar frutas, verduras..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-16 pl-14 pr-6 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-inner text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#80ed99]/50 transition-all font-bold"
                    />
                </motion.div>

                {/* Food Grid */}
                <div className="pb-10">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/30">Alimentos Populares</h3>
                        <span className="text-[10px] font-bold text-slate-500">{filteredFoods.length} encontrados</span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        <AnimatePresence mode='popLayout'>
                            {filteredFoods.map((food, idx) => {
                                const isSelected = selectedFoods.includes(food.id);
                                return (
                                    <motion.button
                                        layout
                                        key={food.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ delay: idx * 0.02 }}
                                        onClick={() => toggleFood(food.id)}
                                        className={cn(
                                            "flex flex-col items-center gap-3 p-4 rounded-[2rem] transition-all duration-300 relative",
                                            isSelected 
                                                ? "bg-white dark:bg-[#80ed99]/20 shadow-xl shadow-slate-200/50 dark:shadow-none border-2 border-[#80ed99]" 
                                                : "bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 shadow-sm"
                                        )}
                                    >
                                        <div className="text-4xl drop-shadow-sm transform group-hover:scale-110 transition-transform">
                                            {food.icon}
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-tight text-center leading-none",
                                            isSelected ? "text-slate-900 dark:text-[#80ed99]" : "text-slate-600 dark:text-white/60"
                                        )}>
                                            {food.name}
                                        </span>
                                        
                                        {isSelected && (
                                            <motion.div 
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-1 -right-1 size-6 bg-[#80ed99] rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-[#0A0C10]"
                                            >
                                                <span className="material-symbols-rounded text-white text-[14px] font-bold">check</span>
                                            </motion.div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Premium Animated Selection Footer */}
            <AnimatePresence>
                {selectedFoods.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-0 left-0 right-0 z-50 p-6"
                    >
                        <div className="max-w-lg mx-auto relative overflow-hidden p-6 rounded-[2.5rem] bg-slate-900/90 dark:bg-white/10 backdrop-blur-3xl border border-white/20 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative size-12 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-[#80ed99] rounded-2xl rotate-12 opacity-20" />
                                    <div className="relative size-10 bg-[#80ed99] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(128,237,153,0.4)]">
                                        <span className="text-slate-900 font-black">{selectedFoods.length}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-black text-sm">{selectedFoods.length === 1 ? 'Alimento listo' : 'Alimentos listos'}</span>
                                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest text-[#80ed99]">Huerta Natural</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="group relative h-20 px-10 rounded-[2.5rem] bg-slate-900 dark:bg-gradient-to-br dark:from-[#2d6a4f] dark:to-[#1b4332] text-white font-black uppercase tracking-widest text-[12px] transition-all duration-500 shadow-2xl active:scale-95 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="relative z-10 flex items-center gap-3">
                                    <span className="material-symbols-rounded text-xl group-hover:rotate-12 transition-transform">potted_plant</span>
                                    {isSaving ? 'Sincronizando...' : 'Guardar Cosecha'}
                                </span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
