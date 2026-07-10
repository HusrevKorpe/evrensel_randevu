/**
 * Randevu akışının ayar sabitleri — TEK yerden değiştirilir.
 * Slot adımını veya kaç gün ileriye randevu açılacağını buradan yönet.
 */

/** Aday başlangıç saatleri arasındaki adım (dakika). 15 = :00, :15, :30, :45 */
export const SLOT_STEP_MIN = 15;

/** Bugünden itibaren kaç gün ileriye randevu alınabilir. */
export const HORIZON_DAYS = 21;
