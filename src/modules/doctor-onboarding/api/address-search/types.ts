/**
 * FACTS of the address search our server proxies to Google Places (`/location/address-search/*`, contract §5 B-7,
 * D-W3-02, D-W3-07, D-W3-33). Google's words in a suggestion are data, never HTML, and never kept (Σ17). Type-only.
 */

export type DoctorOnboardingAddressSuggestion = {
	placeId: string;
	mainText: string;
	secondaryText: string;
};

/** The server mints the session token (UUIDv4) when the request carries none, and hands it back every time (D-W3-02). */
export type DoctorOnboardingAddressSuggestions = {
	sessionToken: string | null;
	suggestions: DoctorOnboardingAddressSuggestion[];
};

/**
 * The picked place as «Επιβεβαιώστε τη διεύθυνση» fills it: one street line, the postal code and the town when Google
 * names them, the point, and `pointProof` — the server's opaque signature of that point (D-W3-33), kept in memory and
 * sent back as it came.
 */
export type DoctorOnboardingAddressDetails = {
	placeId: string;
	streetLine: string;
	postalCode: string | null;
	city: string | null;
	latitude: number;
	longitude: number;
	pointProof: string | null;
};

/** Why the search could not answer: the place is outside Greece, the rate, the service, the session, else. */
export type DoctorOnboardingAddressFailure =
	| 'outside-greece'
	| 'rate-limited'
	| 'unavailable'
	| 'session'
	| 'unknown';
