export {
	consentDecisionKey,
	forgetRecordedConsent,
	readConsentSnapshot,
	readRecordedConsent,
	sanitizeConsentSnapshot,
	writeConsentSnapshot,
	writeRecordedConsent
} from './consent-storage';
export type { ConsentSnapshot } from './consent-storage';
export {
	readPreferencesSnapshot,
	sanitizePreferencesSnapshot,
	writePreferencesSnapshot
} from './preferences-storage';
export type {
	LanguagePreference,
	PreferencesSnapshot,
	ThemePreference
} from './preferences-storage';
