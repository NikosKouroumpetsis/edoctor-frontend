import type { Snippet } from 'svelte';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * Where a «Αλλαγή» screen stands (P-W4 §3.5): `page` a page of its own (the booking's, a `<main>` the screen's height,
 * «←» beside its column from 950), `pane` the right column of an appointment's split (screens 52–54, U-136.2: a
 * `<section>` in the page's `<main>`, «←» in its flow at every width, the change's widths), `solo` the one column in
 * the middle of the wide screen when nothing stands on its left (U-139.1, screen 55's first «Νέος συγγενής»,
 * `55-relatives/appt.css:463`): the `pane` of 744–949 — 640 with its 40 a side — at every width from 744.
 */
export type ChangeFramePlacement = 'page' | 'pane' | 'solo';

/** The frame of every «Αλλαγή» screen (record §3.3, §8.2): «←», the title, the content, «Άκυρο» and «Αποθήκευση». */
export type ChangeFrameProps = {
	title: string;
	subtitle?: string;
	backHref: string;
	onBack: (event: MouseEvent) => void;
	saveLabel?: string;
	saveDisabled?: boolean;
	saveLoading?: boolean;
	/** «Άκυρο» by default; `null` leaves the primary alone at the bar's end (screen 53's «Πίσω στο ραντεβού»). */
	cancelLabel?: string | null;
	/**
	 * The bar of «Άκυρο / Αποθήκευση» (by default). `false` for a screen's own states that have nothing to save — its
	 * wait, a guest's «Σύνδεση», a failure, a refusal (screen 54, `appt.js:382`): their one way on is in their words.
	 */
	bar?: boolean;
	/**
	 * From 950 the list stands beside the screen (screen 55's form, `55-relatives/appt.css:468`): its rows are the way
	 * back, so «←» hides there.
	 */
	besideList?: boolean;
	/**
	 * The screen's end after its bar (screen 55's «Διαγραφή συγγενή», `55-relatives/appt.css:449-454`): below 744 under
	 * the content, the bar pinned beneath it; from 744 after «Άκυρο / Αποθήκευση», last.
	 */
	footer?: Snippet;
	onCancel: () => void;
	onSave: () => void;
	locale: SupportedLocale;
	placement?: ChangeFramePlacement;
	testId?: string;
	children?: Snippet;
};
