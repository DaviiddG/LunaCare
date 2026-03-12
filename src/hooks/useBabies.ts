import { useContext } from 'react';
import { BabiesContext } from '../contexts/BabiesContext';

export const useBabies = () => {
    const context = useContext(BabiesContext);
    if (!context) {
        throw new Error('useBabies must be used within a BabiesProvider');
    }
    return context;
};
