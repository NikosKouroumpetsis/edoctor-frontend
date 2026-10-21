import type { SupportedLocale } from '$shared/preferences/i18n/locales';

export interface DeletionMessageOptions {
	locale: SupportedLocale;
}

export interface DeletionSectionProps {
	messageOptions: DeletionMessageOptions;
}

export interface DeletionSupportProps extends DeletionSectionProps {
	supportEmail: string;
}

export interface RetainedRecord {
	id: string;
	title: string;
	body: string;
	duration: string;
}
