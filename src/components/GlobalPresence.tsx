import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { startOnlinePresence, OnlineUser } from '../services/onlinePresence';
import { STORAGE_KEYS } from '../services/api';

export let globalOnlineUsersCount = 0;
export let globalOnlineUsersList: OnlineUser[] = [];
let subscribers: ((count: number) => void)[] = [];
let listSubscribers: ((users: OnlineUser[]) => void)[] = [];

export const subscribeToPresenceCount = (callback: (count: number) => void) => {
  subscribers.push(callback);
  callback(globalOnlineUsersCount);
  return () => {
    subscribers = subscribers.filter(cb => cb !== callback);
  };
};

export const subscribeToPresenceUsers = (callback: (users: OnlineUser[]) => void) => {
  listSubscribers.push(callback);
  callback(globalOnlineUsersList);
  return () => {
    listSubscribers = listSubscribers.filter(cb => cb !== callback);
  };
};

const notifySubscribers = () => {
  subscribers.forEach(cb => cb(globalOnlineUsersCount));
  listSubscribers.forEach(cb => cb(globalOnlineUsersList));
};

const getUserProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.userData || null;
  } catch {
    return null;
  }
};

export const GlobalPresence = () => {
  const [authTrigger, setAuthTrigger] = useState(0);

  useEffect(() => {
    const handleAuthChange = () => setAuthTrigger(prev => prev + 1);
    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, []);

  useEffect(() => {
    const user = getUserProfile();

    if (!user) {
      globalOnlineUsersCount = 0;
      notifySubscribers();
      return;
    }

    let active = true;
    let stopFn: (() => Promise<void>) | null = null;

    // Debounce to prevent React 18 StrictMode race conditions with Supabase channels
    const timer = setTimeout(() => {
      if (!active) return;
      const { stop } = startOnlinePresence({
        room: 'dashboard-presence',
        user: { username: user.username, NIK: user.NIK },
        onChange: (users) => {
          globalOnlineUsersCount = users.length;
          globalOnlineUsersList = users;
          notifySubscribers();
        },
      });
      stopFn = stop;
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
      if (stopFn) {
        stopFn().catch(console.error);
      }
    };
  }, [authTrigger]);

  return null;
};
