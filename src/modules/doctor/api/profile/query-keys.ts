/**
 * The doctor's reads in TanStack's cache, under ONE root (the application's `doctorQueryKeys`): the profile's
 * reviews, an office, the slots. The profile itself is the route's load (SSR), never a browser read.
 */
export const doctorQueryKeys = {
	all: ['doctor'] as const
};
