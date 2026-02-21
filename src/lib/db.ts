// Mock Supabase service for UI development before actual DB connection
// import { supabase } from './supabase'; // Muted until actual usage

// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const dbHelpers = {
    // Diets
    async insertDiet(data: any) {
        await delay(500);
        console.log('Mock insert diet:', data);
        return { data, error: null };
    },
    async getDiets() {
        await delay(500);
        return { data: [{ type: 'formula', amount: 150, created_at: new Date().toISOString() }], error: null };
    },

    // Diapers
    async insertDiaper(data: any) {
        await delay(500);
        console.log('Mock insert diaper:', data);
        return { data, error: null };
    },
    async getDiapers() {
        await delay(500);
        return { data: [{ status: 'wet', created_at: new Date().toISOString() }], error: null };
    },

    // Sleep
    async insertSleepLog(data: any) {
        await delay(500);
        console.log('Mock insert sleep log:', data);
        return { data, error: null };
    }
};
