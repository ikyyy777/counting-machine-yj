import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type OnlineUser = {
  key: string;
  username: string;
  nik?: string;
  joinedAt: number;
  lastSeen: number;
};

type PresenceMeta = {
  key?: string;
  username?: string;
  nik?: string;
  joined_at?: number;
  last_seen?: number;
};

const toOnlineUsers = (state: Record<string, PresenceMeta[]>): OnlineUser[] => {
  const users: OnlineUser[] = [];

  for (const key of Object.keys(state)) {
    const metas = state[key] || [];
    for (const meta of metas) {
      users.push({
        key: String(meta.key ?? key),
        username: String(meta.username ?? key),
        nik: meta.nik ? String(meta.nik) : undefined,
        joinedAt: Number(meta.joined_at ?? Date.now()),
        lastSeen: Number(meta.last_seen ?? Date.now()),
      });
    }
  }

  const deduped = new Map<string, OnlineUser>();
  for (const u of users) {
    const prev = deduped.get(u.key);
    if (!prev || u.lastSeen > prev.lastSeen) {
      deduped.set(u.key, u);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.username.localeCompare(b.username));
};

export const startOnlinePresence = (params: {
  room?: string;
  user: { username: string; NIK?: string };
  onChange: (users: OnlineUser[]) => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'error' | 'disabled') => void;
}): { stop: () => Promise<void> } => {
  if (!supabase) {
    params.onStatusChange?.('disabled');
    params.onChange([]);
    return {
      stop: async () => {},
    };
  }

  const client = supabase;

  const room = params.room || 'online-users';
  const key = String(params.user.NIK || params.user.username || 'unknown');

  params.onStatusChange?.('connecting');

  let channel: RealtimeChannel | null = client.channel(room, {
    config: {
      presence: { key },
    },
  });

  const emit = () => {
    if (!channel) return;
    const state = channel.presenceState() as Record<string, PresenceMeta[]>;
    params.onChange(toOnlineUsers(state));
  };

  channel
    .on('presence', { event: 'sync' }, () => {
      emit();
    })
    .subscribe(async (status) => {
      if (!channel) return;

      if (status === 'SUBSCRIBED') {
        params.onStatusChange?.('connected');
        await channel.track({
          key,
          username: params.user.username,
          nik: params.user.NIK ? String(params.user.NIK) : undefined,
          joined_at: Date.now(),
          last_seen: Date.now(),
        } satisfies PresenceMeta);
        emit();
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        params.onStatusChange?.('error');
      }
    });

  const heartbeatId = window.setInterval(async () => {
    if (!channel) return;
    try {
      await channel.track({
        key,
        username: params.user.username,
        nik: params.user.NIK ? String(params.user.NIK) : undefined,
        last_seen: Date.now(),
      } satisfies PresenceMeta);
    } catch {
      params.onStatusChange?.('error');
    }
  }, 25000);

  const stop = async () => {
    window.clearInterval(heartbeatId);
    const ch = channel;
    channel = null;
    if (ch) {
      await client.removeChannel(ch);
    }
  };

  return { stop };
};
