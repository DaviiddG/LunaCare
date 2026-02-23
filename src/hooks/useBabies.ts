import { useState, useEffect } from 'react';
import { dbHelpers } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';

export function useBabies() {
    const { user } = useAuth();
    const [babies, setBabies] = useState<any[]>([]);
    const [selectedBaby, setSelectedBaby] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchBabies();

        const handleRefresh = () => {
            if (user) fetchBabies();
        };

        window.addEventListener('luna-action-completed', handleRefresh);
        return () => window.removeEventListener('luna-action-completed', handleRefresh);
    }, [user]);

    const fetchBabies = async () => {
        const { data } = await dbHelpers.getAllBabyProfiles(user!.id);
        if (data && data.length > 0) {
            setBabies(data);
            setSelectedBaby((prev: any) => {
                const stillExists = prev ? data.find((b: any) => b.id === prev.id) : null;
                return stillExists || data[0];
            });
        } else {
            setBabies([]);
            setSelectedBaby(null);
        }
        setLoading(false);
    };

    return { babies, selectedBaby, setSelectedBaby, fetchBabies, loading };
}
