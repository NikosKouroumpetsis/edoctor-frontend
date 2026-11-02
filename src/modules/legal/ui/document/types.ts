import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { LinkRow } from '$shared/ui/molecules/link-rows';
import type { LegalDocumentEdition, LegalDocumentFacts } from '$modules/legal/api/page';

/** What a legal page (wave 1.5, screen 7, U-59.1) needs from its route and screen. */
export type LegalDocumentProps = {
	document: LegalDocumentFacts;
	/** `upcoming` while the announced text is read (`?edition=upcoming`). */
	edition: LegalDocumentEdition | undefined;
	locale: SupportedLocale;
	homeHref: string;
	/** The «Νομικά» page (U-59.3 Ε2), the breadcrumbs' middle step. */
	legalHref: string;
	/** This page's announced edition (`?edition=upcoming`) and its text in force (without it). */
	upcomingHref: string;
	currentHref: string;
	/** «Άλλα νομικά κείμενα»: the other two texts and «Διαγραφή λογαριασμού» (U-59.1 Π6). */
	otherRows: LinkRow[];
	/** A path of this site as the page links it (its language), for the links inside the text. */
	internalHref: (path: string) => string;
	/** After a ToC entry is followed (the screen writes the anchor into the address). */
	onAnchor?: (id: string) => void;
	canonicalUrl: string;
	alternateUrls: Record<SupportedLocale, string>;
};
