/**
 * Wave 4.5 · screen 59 «Σύνδεση και ασφάλεια» (record §5.4): the names no language changes — a provider's, a device's,
 * a browser's — keyed by the server's closed vocabularies (D-W45-35, D-W45-37). A word of the server with no name here
 * has none on the page: it is never printed itself.
 */
export const securityProviderNames = { GOOGLE: 'Google', APPLE: 'Apple' } as const;

/** The provider's name in an address of the page's own ids (`security-provider-google`). */
export const securityProviderSlugs = { GOOGLE: 'google', APPLE: 'apple' } as const;

export const securityDeviceNames = {
	IOS: 'iPhone',
	IPADOS: 'iPad',
	ANDROID: 'Android',
	MACOS: 'macOS',
	WINDOWS: 'Windows',
	LINUX: 'Linux'
} as const;

export const securityBrowserNames = {
	CHROME: 'Chrome',
	SAFARI: 'Safari',
	FIREFOX: 'Firefox',
	EDGE: 'Edge'
} as const;

/** The glyph of a device by its system: a phone, a tablet, a computer (the application's Ionicons). */
export const securityDeviceIcons = {
	IOS: 'phone-portrait-outline',
	IPADOS: 'tablet-portrait-outline',
	ANDROID: 'phone-portrait-outline',
	MACOS: 'laptop-outline',
	WINDOWS: 'laptop-outline',
	LINUX: 'laptop-outline'
} as const;

/** A device whose system the server could not tell is drawn as a computer (the application's rule). */
export const securityUnknownDeviceIcon = 'laptop-outline';
