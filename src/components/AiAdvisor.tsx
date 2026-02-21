import { useState, useEffect } from 'react';
import { getBabyCareAdvice } from '../lib/gemini';
import { Sparkles } from 'lucide-react';

interface AiAdvisorProps {
    lastFeeding: string;
    lastDiaper: string;
    sleepTime: string;
}

export function AiAdvisor({ lastFeeding, lastDiaper, sleepTime }: AiAdvisorProps) {
    const [advice, setAdvice] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        // Solo pedir consejo si hay algún cambio significativo real o al montar el componente (para la demo)
        const fetchAdvice = async () => {
            setIsLoading(true);
            const context = `Última comida: ${lastFeeding}. Último pañal: ${lastDiaper}. Tiempo total de sueño: ${sleepTime}.`;
            const result = await getBabyCareAdvice(context);
            setAdvice(result);
            setIsLoading(false);
        };

        fetchAdvice();
    }, [lastFeeding, lastDiaper, sleepTime]);

    // Si no hay API KEY, el helper devuelve un mensaje amigable o un error.
    return (
        <div className="card" style={{
            background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-secondary-dark) 100%)',
            color: 'white',
            marginTop: '20px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <Sparkles size={24} color="#FFE14C" />
                <h3 style={{ margin: 0, color: 'white' }}>Consejo de la IA</h3>
            </div>

            {isLoading ? (
                <div className="animate-fade-in" style={{ opacity: 0.8, fontSize: '0.95rem' }}>
                    Analizando el día de tu bebé...
                </div>
            ) : (
                <p className="animate-fade-in" style={{ fontSize: '0.95rem', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                    {advice}
                </p>
            )}
        </div>
    );
}
