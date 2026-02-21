import { supabase } from './supabase';

export const dbHelpers = {
    // Diets
    async insertDiet(data: { type: string; amount: number; observations: string; user_id: string }) {
        const { data: result, error } = await supabase
            .from('diets')
            .insert([data])
            .select();
        return { data: result, error };
    },
    async getDiets() {
        const { data, error } = await supabase
            .from('diets')
            .select('*')
            .order('created_at', { ascending: false });
        return { data, error };
    },

    // Diapers
    async insertDiaper(data: { status: string; observations: string; user_id: string }) {
        const { data: result, error } = await supabase
            .from('diapers')
            .insert([data])
            .select();
        return { data: result, error };
    },
    async getDiapers() {
        const { data, error } = await supabase
            .from('diapers')
            .select('*')
            .order('created_at', { ascending: false });
        return { data, error };
    },

    // Sleep
    async insertSleepLog(data: { start_time: string; end_time: string; duration: string; user_id: string }) {
        const { data: result, error } = await supabase
            .from('sleep_logs')
            .insert([data])
            .select();
        return { data: result, error };
    },
    async getSleepLogs() {
        const { data, error } = await supabase
            .from('sleep_logs')
            .select('*')
            .order('created_at', { ascending: false });
        return { data, error };
    },

    // Baby Profiles
    async upsertBabyProfile(data: { user_id: string; name: string; birth_date: string; weight: number; height: number; gender?: string }) {
        const { data: result, error } = await supabase
            .from('baby_profiles')
            .upsert([data], { onConflict: 'user_id' })
            .select();
        return { data: result, error };
    },
    async getBabyProfile(userId: string) {
        const { data, error } = await supabase
            .from('baby_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        return { data, error };
    },

    // Chat History
    async insertChatMessage(data: { user_id: string; role: 'user' | 'luna'; content: string }) {
        const { data: result, error } = await supabase
            .from('chat_history')
            .insert([data])
            .select();
        return { data: result, error };
    },
    async getChatHistory(userId: string, limit = 10) {
        const { data, error } = await supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        return { data: (data || []).reverse(), error };
    }
};


