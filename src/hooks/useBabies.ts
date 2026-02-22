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
    }, [user]);

    const fetchBabies = async () => {
        const { data } = await dbHelpers.getAllBabyProfiles(user!.id);
        if (data && data.length > 0) {
            setBabies(data);
            setSelectedBaby(data[0]);
        }
        setLoading(false);
    };

    return { babies, selectedBaby, setSelectedBaby, fetchBabies, loading };
}
