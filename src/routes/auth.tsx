import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import appIcon from "@/assets/app-icon.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — VibeTube" },
      { name: "description", content: "Sign in to VibeTube to save favorites, keep watch history and manage downloads." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  const intent = () => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    return redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          void navigate({ to: intent(), replace: true });
        } else {
          setSentConfirmation(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: intent(), replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot() {
    if (!email) {
      toast.error("Enter your email first, then tap Forgot password.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent — check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reset email.");
    } finally {
      setBusy(false);
    }
  }

  if (sentConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center animate-scale-in">
          <img src={appIcon} alt="" className="mx-auto h-14 w-14" />
          <h1 className="mt-4 text-xl font-bold text-foreground">Check your inbox</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Tap it to
            activate your account, then sign in.
          </p>
          <button
            type="button"
            onClick={() => setSentConfirmation(false)}
            className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="mb-8 text-center">
          <img src={appIcon} alt="" className="mx-auto h-16 w-16" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">
            Vibe<span className="text-gradient-primary">Tube</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back. Sign in to continue." : "Create your account to start vibing."}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-semibold">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full py-2.5 transition-all ${
                mode === m ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full rounded-xl border border-input bg-muted/50 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              className="h-12 w-full rounded-xl border border-input bg-muted/50 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>

          {mode === "signin" ? (
            <button
              type="button"
              onClick={handleForgot}
              disabled={busy}
              className="w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Forgot password?
            </button>
          ) : null}
        </form>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground/70">
          By continuing you agree to use VibeTube in line with YouTube's Terms of Service. Videos play through the
          official YouTube player.
        </p>
      </div>
    </div>
  );
}
