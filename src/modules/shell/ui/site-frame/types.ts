import type { ResolvedPathname } from '$app/types';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The page's language as the frame's parts read their messages. */
export type FrameMessageOptions = { locale: SupportedLocale };

/** A product path made into the current language's resolved href (`/doctors` ⇒ `/en/doctors`). */
export type LocalizedHref = (path: string) => ResolvedPathname;

/**
 * One entry of the guest's account menu — the ONE list the ☰ menu (from 744) and the capsule's «Προφίλ» sheet
 * (below 744) both draw (U-19.1: «Προφίλ ⇒ Ρυθμίσεις, και για επισκέπτη»). `settings` opens the «Ρυθμίσεις» dialog;
 * the others are pages. `separated`: a rule above it.
 */
export type AccountEntry =
	| {
			key: 'sign-in' | 'help' | 'doctor';
			kind: 'link';
			label: string;
			description?: string;
			href: ResolvedPathname;
			emphasis?: boolean;
			separated?: boolean;
	  }
	| { key: 'settings'; kind: 'settings'; label: string; separated?: boolean };
