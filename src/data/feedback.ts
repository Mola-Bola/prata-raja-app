// Tell …: feedback notes, their threads with Claude, and releases.
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth, useUserId } from './auth';
import type { Enums, Json, Tables } from './database.types';
import { must } from './errors';
import { invalidate } from './invalidate';
import { useAppConfig } from './config';
import { useSavedQuery } from './query';
import { supabase } from './supabase';
import { base64ToBytes, uuid } from './bytes';

export type FeedbackKind = Enums<'feedback_kind'>;
export type FeedbackStatus = Enums<'feedback_status'>;
export type FeedbackRow = Tables<'feedback'>;
export type FeedbackMessage = Tables<'feedback_messages'>;
export type Release = Tables<'releases'>;
export type FeedbackItem = FeedbackRow & {
  author: { id: string; display_name: string } | null;
  messages: Pick<FeedbackMessage, 'id' | 'author_id' | 'author_label' | 'body' | 'created_at'>[];
};

/** Where the note was made — captured automatically. */
export type FeedbackContext = {
  route: string;
  params: Record<string, string>;
  screen: string | null;
  /** The extension the note was written in, or the app's own id (feedback.module). */
  module: string;
  platform: string;
  appVersion: string | null;
  updateId: string | null;
  device: string | null;
};

const LIST = '*, author:profiles!feedback_author_id_fkey(id, display_name), messages:feedback_messages(id, author_id, author_label, body, created_at)';

/** Waiting on the author: Claude asked a question or proposed a plan, or it shipped and needs a thumbs up. */
export const needsYou = (f: Pick<FeedbackRow, 'status'>) => f.status === 'needs_info' || f.status === 'proposed' || f.status === 'shipped';

/** My notes (admins: everyone's), newest activity first. */
export function useFeedbackList() {
  const me = useUserId();
  return useSavedQuery({
    queryKey: ['feedback', 'list'],
    enabled: !!me,
    queryFn: async (): Promise<FeedbackItem[]> => {
      const rows = must(await supabase.from('feedback').select(LIST).order('updated_at', { ascending: false }).limit(200));
      return (rows as FeedbackItem[]).map((r) => ({
        ...r,
        messages: [...r.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      }));
    },
  });
}

export function useFeedbackItem(id: string | undefined) {
  return useSavedQuery({
    queryKey: ['feedback', 'item', id],
    enabled: !!id,
    queryFn: async () => {
      const r = must(await supabase.from('feedback').select(LIST).eq('id', id!).single()) as FeedbackItem;
      let screenshotUrl: string | null = null;
      if (r.screenshot_path) {
        const { data } = await supabase.storage.from('feedback').createSignedUrl(r.screenshot_path, 60 * 60);
        screenshotUrl = data?.signedUrl ?? null;
      }
      return { ...r, messages: [...r.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)), screenshotUrl };
    },
  });
}

export type NewFeedback = { kind: FeedbackKind; body: string; context: FeedbackContext; screenshotBase64?: string | null };

/** Save a note (and its screenshot). The screenshot upload never blocks the note itself. */
export function useSendFeedback() {
  const qc = useQueryClient();
  const me = useUserId();
  return useMutation({
    mutationFn: async (v: NewFeedback): Promise<string> => {
      const id = uuid();
      must(
        await supabase.from('feedback').insert({
          id,
          author_id: me,
          kind: v.kind,
          body: v.body.trim(),
          route: v.context.route,
          params: v.context.params as Json,
          screen: v.context.screen,
          module: v.context.module,
          platform: v.context.platform,
          app_version: v.context.appVersion,
          update_id: v.context.updateId,
          device: v.context.device,
        }),
      );
      if (v.screenshotBase64) {
        const path = `${me}/${id}.jpg`;
        const { error } = await supabase.storage.from('feedback').upload(path, base64ToBytes(v.screenshotBase64), { contentType: 'image/jpeg', upsert: true });
        if (!error) await supabase.from('feedback').update({ screenshot_path: path }).eq('id', id);
      }
      return id;
    },
    onSuccess: () => invalidate(qc, ['feedback']),
  });
}

export function useReplyFeedback() {
  const qc = useQueryClient();
  const { userId, profile } = useAuth();
  return useMutation({
    mutationFn: async (v: { id: string; body: string }) =>
      must(
        await supabase
          .from('feedback_messages')
          .insert({ feedback_id: v.id, author_id: userId, author_label: profile?.display_name || 'You', body: v.body.trim() })
          .select('id')
          .single(),
      ),
    onSuccess: () => invalidate(qc, ['feedback']),
  });
}

export type FeedbackAction = 'approve' | 'not_now' | 'done' | 'reopen';

/** Owner/author moves: Go ahead · Not now · Looks good · Still not right. */
export function useFeedbackAct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; action: FeedbackAction; note?: string }) =>
      must(await supabase.rpc('feedback_act', { p_id: v.id, p_action: v.action, p_note: v.note ?? undefined })) as FeedbackStatus,
    onSuccess: () => invalidate(qc, ['feedback']),
  });
}

export function useReleases() {
  return useSavedQuery({
    queryKey: ['releases'],
    queryFn: async (): Promise<Release[]> => must(await supabase.from('releases').select('*').order('created_at', { ascending: false }).limit(30)),
  });
}

/** Whether this person should see the floating feedback button (app_config.feedback_audience). */
export function useFeedbackEnabled() {
  const { session, profile } = useAuth();
  const config = useAppConfig();
  if (!session) return false;
  const audience = config.data?.feedback_audience ?? 'everyone';
  return audience === 'everyone' || (audience === 'admins' && !!profile?.is_admin);
}
