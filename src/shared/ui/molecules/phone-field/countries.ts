/**
 * The dial-code list of the application (`molecules/phone-field/countries`): `value` is the dial code (the
 * emitted prefix), `name` the country's own name, `label` the flag + name + code of the option list and
 * `triggerLabel` the compact flag + code. Greece is first: it is the default selection.
 */
export type PhoneCountry = {
	flag: string;
	label: string;
	name: string;
	triggerLabel: string;
	value: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
	{ flag: '🇬🇷', name: 'Ελλάδα', value: '+30' },
	{ flag: '🇨🇾', name: 'Κύπρος', value: '+357' },
	{ flag: '🇬🇧', name: 'United Kingdom', value: '+44' },
	{ flag: '🇩🇪', name: 'Deutschland', value: '+49' },
	{ flag: '🇫🇷', name: 'France', value: '+33' },
	{ flag: '🇮🇹', name: 'Italia', value: '+39' },
	{ flag: '🇪🇸', name: 'España', value: '+34' },
	{ flag: '🇳🇱', name: 'Nederland', value: '+31' },
	{ flag: '🇧🇪', name: 'België', value: '+32' },
	{ flag: '🇧🇬', name: 'България', value: '+359' },
	{ flag: '🇷🇴', name: 'România', value: '+40' },
	{ flag: '🇺🇸', name: 'United States', value: '+1' }
].map((country) => ({
	...country,
	label: `${country.flag} ${country.name} ${country.value}`,
	triggerLabel: `${country.flag} ${country.value}`
}));

export const DEFAULT_PHONE_DIAL_CODE = '+30';

/** The application's combined value of a phone field. */
export type PhoneValue = {
	/** The selected dial code, e.g. `+30`. */
	dialCode: string;
	/** The national number as typed (digits and spaces, no dial code). */
	number: string;
};
