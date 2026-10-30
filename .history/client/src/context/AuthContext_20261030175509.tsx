import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { loginRequest, registerRequest } from "../api/auth.api";
import type { AuthSession, User } from "../types/auth.types";

const STORAGE_KEY = "shopflow_auth";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session.user?.role) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistSession(session: AuthSession | null): void {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
}

function getInitialAuthState(): AuthState {
  const session = readStoredSession();
  return {
    user: session?.user ?? null,
    token: session?.token ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(getInitialAuthState);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest({ email, password });
    const session: AuthSession = {
      token: response.token,
      user: response.user,
    };

    setAuthState({ user: session.user, token: session.token });
    persistSession(session);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await registerRequest({ name, email, password });
      const session: AuthSession = {
        token: response.token,
        user: response.user,
      };

      setAuthState({ user: session.user, token: session.token });
      persistSession(session);
    },
    []
  );

  const updateUser = useCallback((updates: Partial<User>) => {
    setAuthState((current) => {
      if (!current.user || !current.token) {
        return current;
      }

      const nextUser = { ...current.user, ...updates };
      persistSession({ token: current.token, user: nextUser });

      return {
        ...current,
        user: nextUser,
      };
    });
  }, []);

  const logout = useCallback(() => {
    setAuthState({ user: null, token: null });
    persistSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user: authState.user,
      token: authState.token,
      isAuthenticated: Boolean(authState.token),
      login,
      register,
      updateUser,
      logout,
    }),
    [authState, login, register, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
