"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ContactErrors } from "@/lib/booking/validate";

export type ContactDraft = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

/**
 * Adım 5: iletişim bilgileri. Değerler yukarıda (sihirbaz) tutulur ki
 * ileri-geri gidince kaybolmasın. Doğrulama "Devam" anında yapılır, hataları
 * `errors` propuyla alır. Aynı kurallar sunucuda da tekrar işletilir.
 */
export function DetailsStep({
  value,
  errors,
  onChange,
}: {
  value: ContactDraft;
  errors: ContactErrors;
  onChange: (patch: Partial<ContactDraft>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Ad Soyad" htmlFor="name" error={errors.name} required>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Örn. Ahmet Yılmaz"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-invalid={!!errors.name}
          className={inputClass(!!errors.name)}
        />
      </Field>

      <Field label="Telefon" htmlFor="phone" error={errors.phone} required>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="05xx xxx xx xx"
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          aria-invalid={!!errors.phone}
          className={inputClass(!!errors.phone)}
        />
      </Field>

      <Field
        label="E-posta"
        htmlFor="email"
        error={errors.email}
        hint="İsteğe bağlı"
      >
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="ornek@eposta.com"
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          aria-invalid={!!errors.email}
          className={inputClass(!!errors.email)}
        />
      </Field>

      <Field
        label="Not"
        htmlFor="notes"
        error={errors.notes}
        hint="İsteğe bağlı"
      >
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Eklemek istediğin bir şey var mı?"
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          aria-invalid={!!errors.notes}
          className={cn(inputClass(!!errors.notes), "resize-none")}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
      >
        {label}
        {required && <span className="text-brand">*</span>}
        {hint && (
          <span className="text-xs font-normal text-muted-foreground">
            ({hint})
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return cn(
    "w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors",
    "placeholder:text-muted-foreground/60",
    "focus:border-brand focus:ring-3 focus:ring-brand/20",
    invalid ? "border-destructive" : "border-input",
  );
}
