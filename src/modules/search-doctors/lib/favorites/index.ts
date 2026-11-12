import { browser } from '$app/environment';
import { favoritePendingStorageKey } from '$shared/config/env';
import { isUuid } from '$shared/lib/ids';
import { matchesSearch } from '$shared/lib/text';
import type { DoctorCard } from '$modules/search-doctors/types';

/** 🔴 U-65.6: the most the favourites' search holds. */
export const FAVORITES_SEARCH_MAX = 100;

/** The words typed, never more than the field holds (the attribute holds it too; the code never trusts only that). */
export function clampFavoritesSearch(value: string): string {
	return Array.from(value).slice(0, FAVORITES_SEARCH_MAX).join('');
}

/**
 * 🔴 U-83.3 / U-85 (the FAQ's one rule, U-60.1, app = web): every word somewhere in the name, the specialty or the area,
 * accents and case aside, `ς` = `σ`. On the device only: the list is there already (≤ 100), and nothing of what is typed
 * goes to the server, the address or a storage. No words ⇒ every card, the same array.
 */
export function filterFavoriteCards<Card extends DoctorCard>(
	cards: readonly Card[],
	words: readonly string[]
): readonly Card[] {
	if (words.length === 0) return cards;
	return cards.filter((card) =>
		matchesSearch(`${card.name} ${card.specialty} ${card.area}`, words)
	);
}

/**
 * U-80.1 Ε4: the doctor a guest's heart asked for, kept in the tab while a provider's redirect runs (the sign-in's own
 * `do=fav` says only «a heart»). A doctor's id, nothing else; it runs once, and goes if the sign-in is left unfinished.
 */
export function writePendingFavorite(doctorId: string) {
	if (!browser) return;
	try {
		window.sessionStorage.setItem(favoritePendingStorageKey, doctorId);
	} catch {
		return;
	}
}

/** Reads and clears it; only what has the shape of an id comes out (U-65.6: the storage is the page's boundary too). */
export function takePendingFavorite(): string | null {
	if (!browser) return null;
	try {
		const stored = window.sessionStorage.getItem(favoritePendingStorageKey);
		window.sessionStorage.removeItem(favoritePendingStorageKey);
		return stored && isUuid(stored) ? stored : null;
	} catch {
		return null;
	}
}

/** The visitor closed the sign-in: the heart that waited for it is forgotten (`w2-w3` §Ανοιχτά 2). */
export function forgetPendingFavorite() {
	takePendingFavorite();
}
