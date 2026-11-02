import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { LinkRow } from '$shared/ui/molecules/link-rows';

export interface DeletionMessageOptions {
	locale: SupportedLocale;
}

export interface DeletionSectionProps {
	messageOptions: DeletionMessageOptions;
	/** The look of the section's H2 (the page's text column decides it). */
	headingClass?: string;
}

export interface DeletionSupportProps extends DeletionSectionProps {
	supportEmail: string;
}

/**
 * The deletion page (U-62.1): what it needs from the rest of the site, composed by its screen — the home, the
 * «Νομικά» page, the other legal texts and the FAQ's deletion question (the rows of «Άλλα νομικά κείμενα»).
 */
export interface DeletionPageProps {
	homeHref: string;
	legalHref: string;
	otherRows: LinkRow[];
	/** After a ToC entry is followed (the screen writes the anchor into the address). */
	onAnchor?: (id: string) => void;
	/** The `<head>`: the page's absolute address and its languages (the site's public origin, U-28.4). */
	canonicalUrl: string;
	alternateUrls: Record<SupportedLocale, string>;
}

export interface RetainedRecord {
	id: string;
	title: string;
	body: string;
	duration: string;
}
