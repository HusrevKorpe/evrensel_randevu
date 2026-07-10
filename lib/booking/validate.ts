/**
 * Randevu formu doğrulama + temizleme.
 *
 * Saf fonksiyonlar (DB yok) → hem istemcide (anında geri bildirim) hem
 * sunucuda (yetkili son söz) kullanılır. Sunucu doğrulaması ŞART: server
 * action doğrudan POST ile de çağrılabilir, istemciye asla güvenmeyiz.
 */

export type BookingContactInput = {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
};

export type CleanContact = {
  name: string;
  phone: string; // E.164: "+905551234567"
  email: string | null;
  notes: string | null;
};

export type ContactErrors = Partial<Record<keyof BookingContactInput, string>>;

export type ValidationResult =
  | { ok: true; value: CleanContact }
  | { ok: false; errors: ContactErrors };

/**
 * Türk cep telefonunu E.164 biçimine getirir, geçersizse null.
 * Kabul: "0555 123 45 67", "+90 555 123 45 67", "5551234567" vb.
 */
export function normalizePhone(raw: string): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("90")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  // Türk cep: 10 hane, "5" ile başlar
  if (d.length === 10 && d.startsWith("5")) return `+90${d}`;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** İletişim bilgilerini doğrular ve temizler. */
export function validateContact(input: BookingContactInput): ValidationResult {
  const errors: ContactErrors = {};

  const name = (input.name ?? "").trim();
  if (name.length < 2) errors.name = "Lütfen adını yaz.";
  else if (name.length > 80) errors.name = "İsim çok uzun.";

  const phone = normalizePhone(input.phone ?? "");
  if (!phone) errors.phone = "Geçerli bir telefon gir (05xx xxx xx xx).";

  const emailRaw = (input.email ?? "").trim();
  let email: string | null = null;
  if (emailRaw) {
    if (emailRaw.length > 120 || !EMAIL_RE.test(emailRaw))
      errors.email = "Geçerli bir e-posta gir.";
    else email = emailRaw.toLowerCase();
  }

  const notesRaw = (input.notes ?? "").trim();
  const notes: string | null = notesRaw || null;
  if (notesRaw.length > 500) errors.notes = "Not çok uzun (en fazla 500 karakter).";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, phone: phone!, email, notes } };
}
