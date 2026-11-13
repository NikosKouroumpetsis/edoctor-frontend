import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** Every address «Απόρρητο» leads to, resolved by the screen in the page's language (a module knows no route). */
export type PrivacyLinks = {
	/** The Privacy policy — at the section of the rights when the legal pages give it an anchor, else its start (D-W45-27). */
	rights: string;
	/** The Privacy policy, its start (the box's link). */
	policy: string;
	/** «Εργαλεία τρίτων και cookies». */
	tools: string;
	/** «Διαγραφή λογαριασμού», step 1. */
	deletion: string;
};

export type PrivacyPageProps = {
	locale: SupportedLocale;
	/** A signed-in person: only then is «Διαγραφή λογαριασμού» there (D-W45-29). */
	member: boolean;
	links: PrivacyLinks;
	/**
	 * 🔴 D-W45-28: what the tools' row says is open («Μόνο τα απαραίτητα», «Απαραίτητα, Στατιστικά»), from the consent's
	 * own catalogue and decision; `null` until it can be said (the row waits, it never guesses).
	 */
	toolsLine: string | null;
};
