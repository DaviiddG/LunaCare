import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from './AuthContext';

interface BabiesContextType {
    babies: any[];
    selectedBaby: any;
    setSelectedBaby: (baby: any) => void;
    fetchBabies: () => Promise<void>;
    loading: boolean;
}

const BabiesContext = createContext<BabiesContextType | null>(null);

export function BabiesProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [babies, setBabies] = useState<any[]>([]);
    const [selectedBaby, setSelectedBaby] = useState<any>(() => {
        // Restore from sessionStorage on first load
        try {
            const saved = sessionStorage.getItem('selectedBabyId');
            return saved ? { id: saved } : null; // Will be replaced with full object after fetch
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchBabies();

        const handleRefresh = () => {
            if (user) fetchBabies();
        };

        window.addEventListener('luna-action-completed', handleRefresh);
        return () => window.removeEventListener('luna-action-completed', handleRefresh);
    }, [user]);

    // Persist selected baby ID to sessionStorage whenever it changes
    useEffect(() => {
        if (selectedBaby?.id) {
            sessionStorage.setItem('selectedBabyId', selectedBaby.id);
        }
    }, [selectedBaby?.id]);

    const fetchBabies = async () => {
        const { data } = await dbHelpers.getAllBabyProfiles(user!.id);
        if (data && data.length > 0) {
            setBabies(data);
            setSelectedBaby((prev: any) => {
                // Keep same baby if it still exists, otherwise pick first
                const stillExists = prev ? data.find((b: any) => b.id === prev.id) : null;
                return stillExists || data[0];
            });
        } else {
            setBabies([]);
            setSelectedBaby(null);
        }
        setLoading(false);
    };

    return (
        <BabiesContext.Provider value={{ babies, selectedBaby, setSelectedBaby, fetchBabies, loading }}>
            {children}
        </BabiesContext.Provider>
    );
}

export function useBabies() {
    const ctx = useContext(BabiesContext);
    if (!ctx) throw new Error('useBabies must be used inside BabiesProvider');
    return ctx;
}
