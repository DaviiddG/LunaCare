import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../hooks/useAuth';

export interface Baby {
    id: string;
    name: string;
    birth_date: string;
    weight: number;
    height: number;
    gender: string;
    avatar_url: string;
    user_id: string;
    created_at?: string;
}

interface BabiesContextType {
    babies: Baby[];
    selectedBaby: Baby | null;
    setSelectedBaby: (baby: Baby | null) => void;
    fetchBabies: () => Promise<void>;
    loading: boolean;
}

export const BabiesContext = createContext<BabiesContextType | null>(null);

export function BabiesProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [babies, setBabies] = useState<Baby[]>([]);
    const [selectedBaby, setSelectedBaby] = useState<Baby | null>(() => {
        // Restore from sessionStorage on first load
        try {
            const saved = sessionStorage.getItem('selectedBabyId');
            return saved ? { id: saved, name: '', birth_date: '', weight: 0, height: 0, gender: '', avatar_url: '', user_id: '' } : null; 
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    const fetchBabies = useCallback(async () => {
        if (!user) return;
        const { data } = await dbHelpers.getAllBabyProfiles(user.id);
        if (data && data.length > 0) {
            setBabies(data);
            setSelectedBaby((prev) => {
                // Keep same baby if it still exists, otherwise pick first
                const stillExists = prev ? data.find((b: Baby) => b.id === prev.id) : null;
                return stillExists || data[0];
            });
        } else {
            setBabies([]);
            setSelectedBaby(null);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) fetchBabies();

        const handleRefresh = () => {
            if (user) fetchBabies();
        };

        window.addEventListener('luna-action-completed', handleRefresh);
        return () => window.removeEventListener('luna-action-completed', handleRefresh);
    }, [user, fetchBabies]);

    // Persist selected baby ID to sessionStorage whenever it changes
    useEffect(() => {
        if (selectedBaby?.id) {
            sessionStorage.setItem('selectedBabyId', selectedBaby.id);
        }
    }, [selectedBaby?.id]);

    return (
        <BabiesContext.Provider value={{ babies, selectedBaby, setSelectedBaby, fetchBabies, loading }}>
            {children}
        </BabiesContext.Provider>
    );
}
