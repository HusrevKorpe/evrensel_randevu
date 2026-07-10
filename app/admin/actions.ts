"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Çıkış (server action): oturumu sonlandırır, çerezleri temizler, login'e döner. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/giris");
}
