import { useState, useEffect } from 'react';
import { getBabyCareAdvice } from '../lib/gemini';
import { Sparkles, Moon } from 'lucide-react';

interface AiAdvisorProps {
    lastFeeding: string;
    lastDiaper: string;
    sleepTime: string;
}

export function AiAdvisor({ lastFeeding, lastDiaper, sleepTime }: AiAdvisorProps) {
    const [advice, setAdvice] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchAdvice = async () => {
            setIsLoading(true);
            const context = `Última comida: ${lastFeeding}. Último pañal: ${lastDiaper}. Tiempo total de sueño: ${sleepTime}.`;
            const result = await getBabyCareAdvice(context);
            setAdvice(result);
            setIsLoading(false);
        };

        fetchAdvice();
    }, [lastFeeding, lastDiaper, sleepTime]);

    return (
        <div className="card" style={{
            background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-secondary-dark) 100%)',
            color: 'white',
            marginTop: '20px',
            position: 'relative',
            overflow: 'hidden',
            border: 'none',
            boxShadow: 'var(--shadow-lg)'
        }}>
            {/* Decorative background element */}
            <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                opacity: 0.1,
                transform: 'rotate(20deg)'
            }}>
                <Moon size={120} color="white" fill="white" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <div style={{
                    padding: '8px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Sparkles size={20} color="#FFE14C" />
                </div>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 700 }}>Luna dice...</h3>
            </div>

            {isLoading ? (
                <div className="animate-pulse" style={{ opacity: 0.9, fontSize: '0.95rem', fontStyle: 'italic' }}>
                    Luna está pensando en lo mejor para tu bebé... ✨
                </div>
            ) : (
                <p className="animate-fade-in" style={{
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    margin: 0,
                    fontWeight: 500,
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                    "{advice}"
                </p>
            )}

            <div style={{ marginTop: '15px', fontSize: '0.75rem', opacity: 0.8, textAlign: 'right' }}>
                Tu Hada Madrina Digital
            </div>
        </div>
    );
}

