"use client";

import { PushOptin } from "@/components/pwa/push-optin";
import {
  removeStaffPushSubscription,
  saveStaffPushSubscription,
} from "@/app/admin/(panel)/actions";

/**
 * Panelde "bu cihaza yeni randevu bildirimi" kartı. Abonelik CİHAZA özeldir —
 * berber telefonuna/tabletine ayrı ayrı izin verebilir. Desteklenmeyen
 * tarayıcıda (ör. bildirim kapalı) PushOptin hiçbir şey göstermez.
 */
export function StaffPush() {
  return (
    <PushOptin
      title="Bu cihaza yeni randevu bildirimi al"
      hint="İzin verirsen yeni bir randevu talebi geldiği an bu cihaza anında bildirim düşer — paneli açık tutmana gerek kalmaz."
      activeText="Bildirim açık — yeni randevular bu cihaza düşecek"
      onSubscribe={saveStaffPushSubscription}
      onUnsubscribe={removeStaffPushSubscription}
    />
  );
}
