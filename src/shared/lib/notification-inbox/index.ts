import type { QueryClient } from '@tanstack/svelte-query';
import type { ModeSide } from '$shared/lib/mode-side';

/**
 * 🔴 Wave 5.1 · screen 75 (D-W51-81, D-W51-89): one account's notifications, each line of ONE side — the patient's
 * (screen 63) or the doctor's (screen 75). The list's reads live in the notifications module; their ONE place in
 * TanStack's cache is said here, because another module writes what makes a side change (the centre's way,
 * `$shared/lib/notification-preferences`): a module never imports another.
 */
export const notificationInboxKey = ['notifications', 'inbox'] as const;

/** Every read of one side — its count and its lists — under one prefix. */
export const notificationInboxSideKey = (side: ModeSide) =>
	[...notificationInboxKey, side] as const;

/**
 * 🔴 U-200.1 · D-W51-91: the server reads «Νέο αίτημα» and «Τι έγινε με την επίσκεψη;» by itself once the doctor
 * answers, from wherever he answers — so after each of the doctor's answers (screens 66 / 68, 69, 70, 71) the doctor's
 * side is asked again: the dot goes out without a reload. The patient's side is never touched.
 */
export function refreshNotificationInboxSide(client: QueryClient, side: ModeSide): void {
	void client.invalidateQueries({ queryKey: notificationInboxSideKey(side) });
}
