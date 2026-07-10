"use client";

import { useActionState } from "react";
import { Lock, LogIn } from "lucide-react";
import { signInAction, type LoginState } from "@/app/admin/giris/actions";
import { Button } from "@/components/ui/button";

/**
 * Giriş formu. `useActionState` ile server action'a bağlanır:
 * - `pending` → gönderim sırasında butonu kilitler
 * - `state.error` → hata mesajını gösterir
 * Başarılı girişte action `redirect` çağırır, burada ele almaya gerek kalmaz.
 */
export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    signInAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="berber@ornek.com"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={inputClass}
        />
      </div>

      {state?.error && (
        <p
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          aria-live="polite"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? (
          "Giriş yapılıyor…"
        ) : (
          <>
            <LogIn />
            Giriş Yap
          </>
        )}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Yalnızca dükkan yöneticisi içindir.
      </p>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand focus:ring-3 focus:ring-brand/20";
