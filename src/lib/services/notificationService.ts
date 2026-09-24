'use client';

import { createClient } from '@/lib/supabase/client';

export interface DBNotification {
  id: string;
  user_id: string;
  type:
    | 'score_ready'
    | 'offer_received'
    | 'booking_confirmed'
    | 'interview_scheduled'
    | 'interview_reminder'
    | 'interview_completed'
    | 'offer_accepted'
    | 'offer_declined'
    | 'system'
    | 'assessment_assigned'
    | 'shortlisted'
    | 'task_due'
    | 'seat_purchase';
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export const notificationService = {
  async getAll(): Promise<DBNotification[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) { console.error('notificationService.getAll:', error.message); return []; }
    return data || [];
  },

  async getUnreadCount(): Promise<number> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) return 0;
    return count || 0;
  },

  async markAsRead(id: string): Promise<void> {
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  async markAllAsRead(): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  },

  async create(notification: Omit<DBNotification, 'id' | 'created_at'>): Promise<DBNotification | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();
    if (error) { console.error('notificationService.create:', error.message); return null; }
    return data;
  },

  subscribeToNew(userId: string, callback: (notification: DBNotification) => void) {
    const supabase = createClient();
    return supabase
      .channel(`notifications-channel-${userId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        callback(payload.new as DBNotification);
      })
      .subscribe();
  },
};

export const roleBenchmarkService = {
  async getByRole(roleName: string): Promise<Record<string, number> | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('role_benchmarks')
      .select('*')
      .ilike('role_name', `%${roleName.split(' ')[0]}%`)
      .maybeSingle();
    if (error || !data) return null;
    return {
      'Technical Depth': data.technical_depth_benchmark,
      'Problem Solving': data.problem_solving_benchmark,
      'System Design': data.system_design_benchmark,
      'Communication': data.communication_benchmark,
      'Role Alignment': data.role_alignment_benchmark,
      avg: data.avg_score_benchmark,
    };
  },

  async getAll(): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('role_benchmarks').select('*').order('role_name');
    if (error) return [];
    return data || [];
  },
};

export const jobPostingService = {
  async getAll(): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('jobPostingService.getAll:', error.message); return []; }
    return data || [];
  },

  async create(posting: any): Promise<any | null> {
    const supabase = createClient();
    const { data, error } = await supabase.from('job_postings').insert(posting).select().single();
    if (error) { console.error('jobPostingService.create:', error.message); return null; }
    return data;
  },

  async update(id: string, updates: any): Promise<any | null> {
    const supabase = createClient();
    const { data, error } = await supabase.from('job_postings').update(updates).eq('id', id).select().single();
    if (error) { console.error('jobPostingService.update:', error.message); return null; }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase.from('job_postings').delete().eq('id', id);
    if (error) { console.error('jobPostingService.delete:', error.message); return false; }
    return true;
  },
};
