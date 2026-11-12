import type { ResolvedPathname } from '$app/types';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The page's language as the frame's parts read their messages. */
export type FrameMessageOptions = { locale: SupportedLocale };

/** A product path made into the current language's resolved href (`/doctors` ⇒ `/en/doctors`). */
export type LocalizedHref = (path: string) => ResolvedPathname;

/**
 * One entry of the account menu from 744 (U-81.3): a page; «Σύνδεση» a page that opens the window in place, so it still
 * goes somewhere before the page's scripts have run; `settings` the «Ρυθμίσεις» dialog; `sign-out` the way out. Below 744
 * there is no menu: the capsule's «Προφίλ» is a page (U-81.1). `separated`: a rule above it.
 */
export type AccountEntry =
	| {
			key: 'sign-in' | 'messages' | 'appointments' | 'favorites' | 'relatives' | 'help' | 'doctor';
			kind: 'link';
			label: string;
			description?: string;
			href: ResolvedPathname;
			emphasis?: boolean;
			separated?: boolean;
			/** 🔴 U-84 Π5: the 8 dot on «Μηνύματα» while a conversation is unread, with what it says aloud. */
			dotLabel?: string;
	  }
	| { key: 'settings'; kind: 'settings'; label: string; separated?: boolean }
	| { key: 'sign-out'; kind: 'sign-out'; label: string; separated?: boolean };

/**
 * The frame's top bar on a page (P-W3 §3.1): `site` the whole bar (from 744), `brand` only the mark over a thin line (the
 * booking), `none` no bar of the frame (the doctor's sign-up draws its own).
 */
export type FrameHeader = 'site' | 'brand' | 'none';
