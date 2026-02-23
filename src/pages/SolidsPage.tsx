import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Clock, Check } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { useBabies } from '../hooks/useBabies';

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

export function SolidsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedBaby } = useBabies();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

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
                observations: 'Registrado desde la cuadrícula de sólidos'
            });
            navigate('/'); // Go back to dashboard on success
        } catch (error) {
            console.error(error);
            alert("Error al guardar los sólidos");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'var(--color-bg)', display: 'flex', flexDirection: 'column',
            fontFamily: 'var(--font-family)', overflow: 'hidden'
        }}>
            {/* Header */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)'
            }}>
                <button onClick={() => navigate('/')} style={{ color: 'var(--color-text-light)' }}>
                    <X size={26} />
                </button>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
                    Agregar Sólidos
                </h2>
                <button style={{ color: 'var(--color-text-light)' }}>
                    <Clock size={24} />
                </button>
            </header>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '100px' }}>

                {/* Search Bar */}
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                    <input
                        type="text"
                        placeholder="Buscar alimentos o agregar abajo"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', padding: '16px 20px', borderRadius: '16px',
                            border: 'none', background: '#f1f5f9', fontSize: '1.05rem',
                            color: 'var(--color-text)', outline: 'none'
                        }}
                    />
                </div>

                {/* Selected Foods Section (Appears only when > 0) */}
                {selectedFoods.length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-light)', marginBottom: '12px' }}>
                            Alimentos agregados
                        </h3>
                        <div style={{
                            background: '#f8fafc', padding: '16px', borderRadius: '16px',
                            display: 'flex', flexWrap: 'wrap', gap: '10px'
                        }}>
                            {selectedFoods.map(foodId => {
                                const food = FOODS.find(f => f.id === foodId);
                                if (!food) return null;
                                return (
                                    <div key={`sel-${food.id}`} style={{
                                        background: 'white', padding: '8px 14px', borderRadius: '24px',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #edf2f7',
                                        fontSize: '0.95rem', fontWeight: 600
                                    }}>
                                        <span>{food.icon}</span>
                                        {food.name}
                                        <button onClick={() => toggleFood(food.id)} style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Most Popular Foods Grid */}
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-light)', marginBottom: '16px' }}>
                    Alimentos más comunes
                </h3>

                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px 12px', paddingBottom: '20px'
                }}>
                    {filteredFoods.map(food => {
                        const isSelected = selectedFoods.includes(food.id);
                        return (
                            <div
                                key={food.id}
                                onClick={() => toggleFood(food.id)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        width: '64px', height: '64px', borderRadius: '50%',
                                        background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '2.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                        border: isSelected ? '2px solid #38bdf8' : '2px solid transparent',
                                        transition: 'all 0.2s'
                                    }}>
                                        {food.icon}
                                    </div>
                                    <div style={{
                                        position: 'absolute', top: '-4px', right: '-4px',
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        background: isSelected ? '#38bdf8' : 'white',
                                        color: isSelected ? 'white' : '#94a3b8',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)', border: isSelected ? 'none' : '1px solid #e2e8f0',
                                        transition: 'all 0.2s'
                                    }}>
                                        {isSelected ? <Check size={14} strokeWidth={4} /> : '+'}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text)',
                                    textAlign: 'center', lineHeight: '1.2'
                                }}>
                                    {food.name}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Bottom Floating Bar */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'white', padding: '20px', borderTop: '1px solid #edf2f7',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 -10px 30px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.05rem', color: 'var(--color-text-light)', fontWeight: 600 }}>
                        Seleccionado
                    </span>
                    <div style={{
                        background: '#38bdf8', color: 'white', width: '28px', height: '28px',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '0.9rem'
                    }}>
                        {selectedFoods.length}
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={selectedFoods.length === 0 || isSaving}
                    style={{
                        background: selectedFoods.length > 0 ? '#80ed99' : '#e2e8f0',
                        color: selectedFoods.length > 0 ? '#14532d' : '#94a3b8',
                        padding: '16px 40px', borderRadius: '30px', fontWeight: 800,
                        fontSize: '1.1rem', transition: 'all 0.2s',
                        boxShadow: selectedFoods.length > 0 ? '0 8px 20px rgba(128,237,153,0.4)' : 'none',
                        cursor: selectedFoods.length > 0 ? 'pointer' : 'default'
                    }}
                >
                    {isSaving ? 'Guardando...' : 'Siguiente'}
                </button>
            </div>
        </div>
    );
}
