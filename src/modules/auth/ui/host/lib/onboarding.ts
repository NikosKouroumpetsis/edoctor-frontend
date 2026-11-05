const exemptPaths = ['/account-deletion', '/legal'];

/**
 * The pages the owed profile does not cover (Π1 · 9): its «Διαγραφή λογαριασμού» leads to one and the legal texts must
 * stay readable. Everywhere else it stays until it is done, as the application's gate.
 */
export function isOnboardingExempt(basePath: string): boolean {
	return exemptPaths.some((path) => basePath === path || basePath.startsWith(`${path}/`));
}
