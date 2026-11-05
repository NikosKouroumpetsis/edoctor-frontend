/**
 * The doctor's reads in TanStack's cache, under ONE root (the application's `doctorQueryKeys`): the profile's
 * reviews, an office, the slots. The profile itself is the route's load (SSR); only a member reads it again in the
 * browser, with the cookies, for what it alone may see (U-34.4, the prices).
 */
export const doctorQueryKeys = {
	all: ['doctor'] as const,
	memberProfile: (slug: string, lang: string) => ['doctor', 'member-profile', slug, lang] as const
};
