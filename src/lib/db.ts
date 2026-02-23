import { supabase } from './supabase';

export const dbHelpers = {
    // Diets
    async insertDiet(data: { type: string; amount: number; observations: string; user_id: string; baby_id: string }) {
        const { data: result, error } = await supabase
            .from('diets').insert([data]).select();
        return { data: result, error };
    },
    async getDiets(babyId: string) {
        const { data, error } = await supabase
            .from('diets').select('*').eq('baby_id', babyId).order('created_at', { ascending: false });
        return { data, error };
    },

    // Diapers
    async insertDiaper(data: { status: string; observations: string; user_id: string; baby_id: string }) {
        const { data: result, error } = await supabase
            .from('diapers').insert([data]).select();
        return { data: result, error };
    },
    async getDiapers(babyId: string) {
        const { data, error } = await supabase
            .from('diapers').select('*').eq('baby_id', babyId).order('created_at', { ascending: false });
        return { data, error };
    },

    // Sleep
    async insertSleepLog(data: { start_time: string; end_time: string; duration: string; user_id: string; baby_id: string }) {
        const { data: result, error } = await supabase
            .from('sleep_logs').insert([data]).select();
        return { data: result, error };
    },
    async getSleepLogs(babyId: string) {
        const { data, error } = await supabase
            .from('sleep_logs').select('*').eq('baby_id', babyId).order('created_at', { ascending: false });
        return { data, error };
    },

    // Solids
    async insertSolids(data: { foods: string[]; amount: string; observations: string; user_id: string; baby_id: string }) {
        const { data: result, error } = await supabase
            .from('solids_logs').insert([data]).select();
        return { data: result, error };
    },
    async getSolids(babyId: string) {
        const { data, error } = await supabase
            .from('solids_logs').select('*').eq('baby_id', babyId).order('created_at', { ascending: false });
        return { data, error };
    },

    // Medicine
    async insertMedicine(data: { name: string; dosage: string; observations: string; user_id: string; baby_id: string }) {
        const { data: result, error } = await supabase
            .from('medicine_logs').insert([data]).select();
        return { data: result, error };
    },
    async getMedicine(babyId: string) {
        const { data, error } = await supabase
            .from('medicine_logs').select('*').eq('baby_id', babyId).order('created_at', { ascending: false });
        return { data, error };
    },

    // Growth
    async insertGrowth(data: { weight: number; height: number; head_circumference?: number; user_id: string; baby_id: string }) {
        const { data: result, error } = await supabase
            .from('growth_logs').insert([data]).select();
        return { data: result, error };
    },
    async getGrowth(babyId: string) {
        const { data, error } = await supabase
            .from('growth_logs').select('*').eq('baby_id', babyId).order('created_at', { ascending: false });
        return { data, error };
    },

    // Temperature
    async insertTemperature(data: { temperature: number; unit: string; user_id: string; baby_id: string }) {
        const { data: result, error } = await supabase
            .from('temperature_logs').insert([data]).select();
        return { data: result, error };
    },
    async getTemperature(babyId: string) {
        const { data, error } = await supabase
            .from('temperature_logs').select('*').eq('baby_id', babyId).order('created_at', { ascending: false });
        return { data, error };
    },

    // Activity
    async insertActivity(data: { activity_type: string; duration_minutes: number; observations: string; user_id: string; baby_id: string }) {
        const { data: result, error } = await supabase
            .from('activity_logs').insert([data]).select();
        return { data: result, error };
    },
    async getActivity(babyId: string) {
        const { data, error } = await supabase
            .from('activity_logs').select('*').eq('baby_id', babyId).order('created_at', { ascending: false });
        return { data, error };
    },

    // Baby Profiles — supports MULTIPLE babies per user
    async upsertBabyProfile(data: { user_id: string; id?: string; name: string; birth_date: string; weight: number; height: number; gender?: string; avatar_url?: string }) {
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
    async deleteBabyProfile(babyId: string, userId: string) {
        // Enforce user_id along with baby_id for security
        const { data, error } = await supabase
            .from('baby_profiles').delete()
            .eq('id', babyId)
            .eq('user_id', userId);
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
    },

    // ==========================================
    // AI CONVERSATIONS (Luna Assistant Fase 2)
    // ==========================================
    async getAiConversations(babyId: string, limit = 50) {
        const { data, error } = await supabase
            .from('ai_conversations')
            .select('*')
            .eq('baby_id', babyId)
            .order('created_at', { ascending: false })
            .limit(limit);
        return { data: (data || []).reverse(), error };
    },

    async insertAiMessage(data: { user_id: string; baby_id: string; role: 'user' | 'assistant'; content: string }) {
        const { data: result, error } = await supabase
            .from('ai_conversations')
            .insert([data])
            .select()
            .single();
        return { data: result, error };
    },

    async deleteAiConversations(babyId: string) {
        const { error } = await supabase
            .from('ai_conversations')
            .delete()
            .eq('baby_id', babyId);
        return { error };
    },

    // User Settings
    async getUserSettings(userId: string) {
        const { data, error } = await supabase
            .from('user_settings').select('*').eq('user_id', userId).maybeSingle();
        return { data, error };
    },
    async updateUserSettings(userId: string, layout: string[]) {
        const { data, error } = await supabase
            .from('user_settings').upsert({ user_id: userId, dashboard_layout: layout, updated_at: new Date().toISOString() }).select();
        return { data, error };
    }
};
