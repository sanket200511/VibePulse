import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getApiBaseUrl } from "./api-config";

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_verified: boolean;
  provider: string;
  created_at: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; requireVerification?: boolean }>;
  register: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resendCode: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = "vibepulse_auth_token";

async function fetchWithWarmupRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
): Promise<Response> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, options);
      if ((res.status === 502 || res.status === 503) && attempt < maxRetries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 2500));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Backend connection timed out while waking up.");
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveToken = useCallback((newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, []);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers || {});
      const currentToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
      if (currentToken) {
        headers.set("Authorization", `Bearer ${currentToken}`);
      }
      return fetchWithWarmupRetry(url, { ...options, headers });
    },
    [token],
  );

  // Validate session on boot or token change
  useEffect(() => {
    let isMounted = true;
    const fetchCurrentUser = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await fetchWithWarmupRetry(`${getApiBaseUrl()}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const userData = (await res.json()) as User;
          if (isMounted) {
            setUser(userData);
          }
        } else {
          saveToken(null);
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn("Auth session check paused while backend wakes up:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchCurrentUser();
    return () => {
      isMounted = false;
    };
  }, [saveToken]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetchWithWarmupRetry(`${getApiBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.detail?.includes("Email not verified")) {
          return { success: false, requireVerification: true, error: data.detail };
        }
        return { success: false, error: data.detail || "Login failed. Please check credentials." };
      }

      const authData = data as AuthResponse;
      saveToken(authData.access_token);
      setUser(authData.user);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Backend is currently waking up on Render. Please wait a moment and try again.",
      };
    }
  };

  const register = async (email: string, password: string, fullName?: string) => {
    try {
      const res = await fetchWithWarmupRetry(`${getApiBaseUrl()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || "Registration failed." };
      }
      return { success: true, message: data.message };
    } catch {
      return {
        success: false,
        error: "Backend is currently waking up on Render. Please wait a moment and try again.",
      };
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      const res = await fetchWithWarmupRetry(`${getApiBaseUrl()}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || "Verification failed." };
      }

      const authData = data as AuthResponse;
      saveToken(authData.access_token);
      setUser(authData.user);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Backend is currently waking up on Render. Please wait a moment and try again.",
      };
    }
  };

  const resendCode = async (email: string) => {
    try {
      const res = await fetchWithWarmupRetry(`${getApiBaseUrl()}/api/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || "Failed to resend code." };
      }
      return { success: true, message: data.message };
    } catch {
      return {
        success: false,
        error: "Backend is currently waking up on Render. Please wait a moment and try again.",
      };
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const res = await fetchWithWarmupRetry(`${getApiBaseUrl()}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || "Google authentication failed." };
      }

      const authData = data as AuthResponse;
      saveToken(authData.access_token);
      setUser(authData.user);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Backend is currently waking up on Render. Please wait a moment and try again.",
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.warn("Error during remote logout:", err);
    } finally {
      saveToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        verifyEmail,
        resendCode,
        loginWithGoogle,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
