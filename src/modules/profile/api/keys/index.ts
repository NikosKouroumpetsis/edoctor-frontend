/**
 * The module's reads in TanStack's cache, under ONE root (the application's `profileUserQueryKeys`). Every one of them
 * is personal: a sign-out removes them all (`personalQueryMeta`).
 */
export const profileQueryKeys = {
	all: ['profile'] as const,
	/** The language the account's messages are written in (`GET /user/me`, its `locale` alone). */
	accountLocale: () => [...profileQueryKeys.all, 'account-locale'] as const,
	/** Wave 4.5 · screen 58: the gender and the date of birth of «Προσωπικά στοιχεία» (`GET /user/me`, those two alone). */
	accountPerson: () => [...profileQueryKeys.all, 'account-person'] as const
};
