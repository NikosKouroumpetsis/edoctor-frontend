export const defaultLocale = 'el';

export const languages = [
	{
		locale: 'el',
		label: 'Ελληνικά',
		shortLabel: 'EL'
	},
	{
		locale: 'en',
		label: 'English',
		shortLabel: 'EN'
	}
] as const;

export type SupportedLocale = (typeof languages)[number]['locale'];
