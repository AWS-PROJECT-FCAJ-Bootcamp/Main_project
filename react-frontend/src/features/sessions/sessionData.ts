import { sessionsApi } from '../../services/api';

export interface SavedSession {
  id: string;
  name: string;
  description?: string;
  params: Record<string, any>;
  created_at: string;
  updated_at: string;
  source: 'local' | 'api';
  item_count: number;
}

export interface SessionPayload {
  name: string;
  description?: string;
  params: Record<string, any>;
}

const STORAGE_KEY = 'fsd-sessions';

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const countParams = (params: Record<string, any>): number => {
  if (!isPlainObject(params)) return 0;
  return Object.keys(params).length;
};

const fallbackId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const normalizeSession = (raw: any): SavedSession => {
  const params = isPlainObject(raw?.params) ? raw.params : {};
  const createdAt = raw?.created_at ?? raw?.createdAt ?? new Date().toISOString();
  const updatedAt = raw?.updated_at ?? raw?.updatedAt ?? createdAt;

  return {
    id: String(raw?.id ?? fallbackId()),
    name: String(raw?.name ?? 'Session không tên'),
    description: raw?.description ? String(raw.description) : undefined,
    params,
    created_at: createdAt,
    updated_at: updatedAt,
    source: raw?.source === 'api' ? 'api' : 'local',
    item_count: Number(raw?.item_count ?? countParams(params)),
  };
};

export const readLocalSessions = (): SavedSession[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(normalizeSession);
  } catch {
    return [];
  }
};

export const writeLocalSessions = (sessions: SavedSession[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

const mergeSessions = (sessions: SavedSession[]) => {
  const deduped = new Map<string, SavedSession>();
  sessions.forEach((session) => deduped.set(session.id, session));
  return Array.from(deduped.values()).sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
};

export const listSessions = async (): Promise<SavedSession[]> => {
  const localSessions = readLocalSessions();

  try {
    const remoteSessions = await sessionsApi.list();
    if (!Array.isArray(remoteSessions)) {
      return mergeSessions(localSessions);
    }

    const normalizedRemote = remoteSessions.map((session: any) => ({
      ...normalizeSession(session),
      source: 'api' as const,
    }));

    return mergeSessions([...normalizedRemote, ...localSessions]);
  } catch {
    return mergeSessions(localSessions);
  }
};

export const getSessionById = async (sessionId: string): Promise<SavedSession | null> => {
  if (!sessionId) return null;

  try {
    const remoteSession = await sessionsApi.get(sessionId);
    if (remoteSession) {
      return {
        ...normalizeSession(remoteSession),
        source: 'api',
      };
    }
  } catch {
    // fallback to local cache below
  }

  return readLocalSessions().find((session) => session.id === sessionId) ?? null;
};

export const createSession = async (payload: SessionPayload): Promise<SavedSession> => {
  const now = new Date().toISOString();
  const localSession: SavedSession = {
    id: fallbackId(),
    name: payload.name.trim() || 'Session không tên',
    description: payload.description?.trim() || undefined,
    params: payload.params,
    created_at: now,
    updated_at: now,
    source: 'local',
    item_count: countParams(payload.params),
  };

  try {
    const remoteSession = await sessionsApi.create({
      name: localSession.name,
      description: localSession.description,
      params: localSession.params,
    });

    const normalized = {
      ...normalizeSession(remoteSession),
      source: 'api' as const,
    };
    const sessions = readLocalSessions().filter((session) => session.id !== normalized.id);
    writeLocalSessions(mergeSessions([normalized, ...sessions]));
    return normalized;
  } catch {
    const sessions = readLocalSessions().filter((session) => session.id !== localSession.id);
    writeLocalSessions(mergeSessions([localSession, ...sessions]));
    return localSession;
  }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    await sessionsApi.delete(sessionId);
  } catch {
    // Keep local fallback in sync even if remote API is unavailable.
  }

  const remaining = readLocalSessions().filter((session) => session.id !== sessionId);
  writeLocalSessions(remaining);
};
