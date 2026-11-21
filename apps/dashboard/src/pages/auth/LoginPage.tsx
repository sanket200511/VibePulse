import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";
import { ThemeToggle } from "../../components/theme/ThemeToggle";
import { useTheme } from "../../components/theme/ThemeProvider";
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type AuthMode = "login" | "register" | "verify";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number | string;
            },
          ) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

export function LoginPage() {
  const { login, register, verifyEmail, resendCode, loginWithGoogle, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const digitInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const googleBtnContainerRef = useRef<HTMLDivElement | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
      void navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Handle resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Initialize Google Identity Services (GCP)
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    const loadGoogleScript = () => {
      if (window.google?.accounts?.id) {
        initGis(googleClientId);
        return;
      }
      const existingScript = document.getElementById("google-gis-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-gis-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => initGis(googleClientId);
        document.body.appendChild(script);
      }
    };

    const initGis = (clientId: string) => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            setLoading(true);
            setError(null);
            void (async () => {
              const res = await loginWithGoogle(response.credential);
              setLoading(false);
              if (!res.success) {
                setError(res.error || "Google authentication failed.");
              }
            })();
          }
        },
      });

      if (googleBtnContainerRef.current) {
        googleBtnContainerRef.current.innerHTML = "";
        const isDark =
          theme === "dark" ||
          (theme === "system" &&
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);

        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: isDark ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          width: 320,
          text: mode === "register" ? "signup_with" : "signin_with",
        });
      }
    };

    loadGoogleScript();
  }, [mode, loginWithGoogle, theme]);

  // Submit password login or registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    if (mode === "login") {
      const res = await login(email, password);
      setLoading(false);
      if (res.requireVerification) {
        setMode("verify");
        setInfoMessage("Please enter the 6-digit verification code sent to your email.");
        setResendCooldown(60);
      } else if (!res.success) {
        setError(res.error || "Login failed.");
      }
    } else if (mode === "register") {
      const res = await register(email, password, fullName);
      setLoading(false);
      if (res.success) {
        setMode("verify");
        setInfoMessage(res.message || "Verification code sent to your email address.");
        setResendCooldown(60);
      } else {
        setError(res.error || "Registration failed.");
      }
    }
  };

  // 6-digit verification handlers
  const handleDigitChange = (index: number, val: string) => {
    const sanitized = val.replace(/\D/g, "");
    if (!sanitized) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    // Single or pasted multiple digits
    const chars = sanitized.split("");
    const newDigits = [...digits];
    for (let i = 0; i < chars.length && index + i < 6; i++) {
      const char = chars[i];
      if (char !== undefined) {
        newDigits[index + i] = char;
      }
    }
    setDigits(newDigits);

    // Focus next empty input
    const nextIndex = Math.min(index + chars.length, 5);
    digitInputsRef.current[nextIndex]?.focus();

    // Auto-verify if all 6 filled
    if (newDigits.every((d) => d !== "")) {
      void triggerVerify(newDigits.join(""));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      digitInputsRef.current[index - 1]?.focus();
    }
  };

  const triggerVerify = async (fullCode: string) => {
    setLoading(true);
    setError(null);
    const res = await verifyEmail(email, fullCode);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Invalid verification code.");
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    const res = await resendCode(email);
    setLoading(false);
    if (res.success) {
      setInfoMessage("A fresh 6-digit code has been dispatched to your email.");
      setResendCooldown(60);
    } else {
      setError(res.error || "Failed to resend verification code.");
    }
  };

  return (
    <div className="bg-background text-foreground relative flex min-h-[calc(100vh-3rem)] items-center justify-center overflow-hidden px-4 py-12">
      {/* Theme Toggle in top-right */}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* Dynamic background glows */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl filter" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl filter" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header Branding */}
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 font-mono text-base font-bold text-white shadow-lg shadow-cyan-500/20">
              V
            </span>
            <span className="text-foreground text-2xl font-bold tracking-tight">VibePulse</span>
          </Link>
          <p className="text-muted-foreground mt-2 text-sm">
            {mode === "verify"
              ? "Confirm your email to complete verification"
              : mode === "register"
                ? "Create your account for live developer intelligence"
                : "Sign in to monitor live project telemetry"}
          </p>
        </div>

        {/* Card */}
        <div className="border-border/80 bg-card text-card-foreground rounded-2xl border p-7 shadow-2xl backdrop-blur-xl">
          {/* Notifications */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="border-primary/20 bg-primary/10 text-primary mb-5 flex items-start gap-2.5 rounded-xl border p-3 text-xs">
              <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {mode === "verify" ? (
            /* 6-DIGIT VERIFICATION VIEW */
            <div>
              <div className="mb-6 text-center">
                <div className="bg-primary/10 text-primary mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-foreground text-lg font-semibold">Verify Your Email</h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  We sent a 6-digit code to{" "}
                  <span className="text-foreground font-medium">{email}</span>
                </p>
              </div>

              {/* 6 Digits Inputs */}
              <div className="mb-6 flex justify-between gap-2">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (digitInputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    className="border-input bg-background text-foreground focus:border-primary focus:ring-primary/20 h-13 shadow-xs w-11 rounded-xl border text-center font-mono text-xl font-bold transition-all focus:outline-none focus:ring-2"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  void triggerVerify(digits.join(""));
                }}
                disabled={loading || digits.some((d) => d === "")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Resend actions */}
              <div className="text-muted-foreground mt-5 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    void handleResend();
                  }}
                  disabled={loading || resendCooldown > 0}
                  className="text-primary hover:text-primary/80 font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            /* LOGIN / REGISTER VIEW */
            <div>
              {/* Google OAuth (GCP) */}
              <div className="mb-5 flex flex-col items-center">
                <div ref={googleBtnContainerRef} className="flex justify-center" />
                {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                  <div className="w-full">
                    <button
                      type="button"
                      onClick={() =>
                        setError(
                          "To use Google Login, configure VITE_GOOGLE_CLIENT_ID in your dashboard environment.",
                        )
                      }
                      className="border-border bg-secondary/50 hover:bg-secondary text-foreground flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-2.5 text-xs font-medium transition-colors"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign in with Google (GCP)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="relative mb-5 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="border-border w-full border-t" />
                </div>
                <span className="bg-card text-muted-foreground relative px-2.5 text-[11px] uppercase tracking-wider">
                  Or with email
                </span>
              </div>

              {/* Form */}
              <form
                onSubmit={(e) => {
                  void handleSubmit(e);
                }}
                className="space-y-4"
              >
                {mode === "register" && (
                  <div>
                    <label className="text-foreground mb-1.5 block text-xs font-medium">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="text-muted-foreground pointer-events-none absolute left-3 top-3 h-4 w-4" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ada Lovelace"
                        className="border-input bg-background/80 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-2.5 pl-9 pr-3 text-xs transition-colors focus:outline-none focus:ring-1"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-foreground mb-1.5 block text-xs font-medium">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="text-muted-foreground pointer-events-none absolute left-3 top-3 h-4 w-4" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="developer@vibepulse.dev"
                      className="border-input bg-background/80 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-2.5 pl-9 pr-3 text-xs transition-colors focus:outline-none focus:ring-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-foreground mb-1.5 block text-xs font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="text-muted-foreground pointer-events-none absolute left-3 top-3 h-4 w-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="border-input bg-background/80 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 w-full rounded-xl border py-2.5 pl-9 pr-9 text-xs transition-colors focus:outline-none focus:ring-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground absolute right-3 top-3"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25 mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>{mode === "register" ? "Create Account" : "Sign In"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Mode toggle */}
              <div className="text-muted-foreground mt-5 text-center text-xs">
                {mode === "login" ? (
                  <p>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("register");
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="text-primary hover:text-primary/80 font-medium hover:underline"
                    >
                      Create one
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="text-primary hover:text-primary/80 font-medium hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footnote */}
        <div className="text-muted-foreground mt-6 flex items-center justify-center gap-1.5 text-xs">
          <Sparkles className="text-primary h-3.5 w-3.5" />
          <span>Secured with JWT & Redis Session Revocation</span>
        </div>
      </div>
    </div>
  );
}
