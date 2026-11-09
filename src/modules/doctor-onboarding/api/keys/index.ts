/**
 * The sign-up's reads in TanStack's cache, under ONE root (the application's `doctorOnboardingQueryKeys`): the progress,
 * the specialties' catalogue, the address search's suggestions, a typed town's centre and the doctors' terms' version
 * (41). Every one wears the
 * sign-out's mark (`personalQueryMeta`): a sign-out leaves none of them in the tab.
 */
export const doctorOnboardingQueryKeys = {
	all: ['doctor-onboarding'] as const,
	progress: () => [...doctorOnboardingQueryKeys.all, 'progress'] as const,
	professions: () => [...doctorOnboardingQueryKeys.all, 'professions'] as const,
	addressSearch: () => [...doctorOnboardingQueryKeys.all, 'address-search'] as const,
	addressSuggestions: (input: string) =>
		[...doctorOnboardingQueryKeys.addressSearch(), input] as const,
	town: (town: string, locale: string) =>
		[...doctorOnboardingQueryKeys.all, 'town', locale, town] as const,
	termsVersion: (locale: string) =>
		[...doctorOnboardingQueryKeys.all, 'terms-version', locale] as const
};
