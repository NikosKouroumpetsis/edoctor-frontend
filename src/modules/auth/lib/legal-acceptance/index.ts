import type { AuthLegalAcceptance } from '$modules/auth/types';

/**
 * The acceptance a new account carries: every required document at the version published right now, or `null` when
 * one cannot be read (the application's `buildLegalAcceptance`). Versions are read at submit time, never kept.
 */
export function buildLegalAcceptance(
	documents: readonly { documentCode: string; version: string | null }[]
): AuthLegalAcceptance | null {
	const acceptances = documents.flatMap((document) =>
		document.version
			? [
					{
						accepted: true as const,
						documentCode: document.documentCode,
						version: document.version
					}
				]
			: []
	);
	return acceptances.length > 0 && acceptances.length === documents.length
		? { context: 'PATIENT', acceptances }
		: null;
}
