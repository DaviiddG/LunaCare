import { supabase } from './supabase';

export const dbHelpers = {
    // Diets
    async insertDiet(data: { type: string; amount: number; observations: string; user_id: string }) {
        const { data: result, error } = await supabase
            .from('diets').insert([data]).select();
        return { data: result, error };
    },
    async getDiets() {
        const { data, error } = await supabase
            .from('diets').select('*').order('created_at', { ascending: false });
        return { data, error };
    },

    // Diapers
    async insertDiaper(data: { status: string; observations: string; user_id: string }) {
        const { data: result, error } = await supabase
            .from('diapers').insert([data]).select();
        return { data: result, error };
    },
    async getDiapers() {
        const { data, error } = await supabase
            .from('diapers').select('*').order('created_at', { ascending: false });
        return { data, error };
    },

    // Sleep
    async insertSleepLog(data: { start_time: string; end_time: string; duration: string; user_id: string }) {
        const { data: result, error } = await supabase
            .from('sleep_logs').insert([data]).select();
        return { data: result, error };
    },
    async getSleepLogs() {
        const { data, error } = await supabase
            .from('sleep_logs').select('*').order('created_at', { ascending: false });
        return { data, error };
    },

    // Baby Profiles — supports MULTIPLE babies per user
    async upsertBabyProfile(data: { user_id: string; id?: string; name: string; birth_date: string; weight: number; height: number; gender?: string }) {
        if (data.id) {
            // Edit existing baby by id
            const { id, ...rest } = data;
            const { data: result, error } = await supabase
                .from('baby_profiles').update(rest).eq('id', id).select();
            return { data: result, error };
        } else {
            // Insert new baby
            const { data: result, error } = await supabase
                .from('baby_profiles').insert([data]).select();
            return { data: result, error };
        }
    },
    async getAllBabyProfiles(userId: string) {
        const { data, error } = await supabase
            .from('baby_profiles').select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });
        return { data, error };
    },
    // Keep for backwards compat (used by SettingsPage editing first baby)
    async getBabyProfile(userId: string) {
        const { data, error } = await supabase
            .from('baby_profiles').select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
        return { data, error };
    },

    // Chat History (kept for potential future use)
    async insertChatMessage(data: { user_id: string; role: 'user' | 'luna'; content: string }) {
        const { data: result, error } = await supabase
            .from('chat_history').insert([data]).select();
        return { data: result, error };
    },
    async getChatHistory(userId: string, limit = 10) {
        const { data, error } = await supabase
            .from('chat_history').select('*').eq('user_id', userId)
            .order('created_at', { ascending: false }).limit(limit);
        return { data: (data || []).reverse(), error };
    }
};
