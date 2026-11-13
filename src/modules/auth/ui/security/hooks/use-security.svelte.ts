import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { authQueryKeys } from '$modules/auth/api/session';
import { accountSessionsQuery } from '$modules/auth/api/sessions';
import { signInMethodsQuery } from '$modules/auth/api/sign-in-methods';
import {
	buildSecurityPasswordRow,
	buildSecurityProviderRows,
	buildSecuritySessionRows
} from '$modules/auth/lib/security';
import type { SecurityPageProps } from '../types';

type ReadView = 'loading' | 'failed' | 'ready';

/**
 * Screen 59 (record §5.4): the page's two reads — how the account signs in (`GET /auth/sign-in-methods/me`: the
 * password's row and the providers') and where it is signed in from (`GET /auth/sessions/me`) — each with its own wait
 * and its own failure, whether the password's row is open (every other row fades meanwhile), and the reads again after
 * a change. A session that ended opens the sign-in (U-84). 🔴 U-168: no password and no code is ever kept here — they
 * live in the open row's own form and go with it.
 */
export function useSecurity(props: () => SecurityPageProps) {
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const client = useQueryClient();
	const member = () => browser && session?.isMember === true;
	const methods = createQuery(() => ({ ...signInMethodsQuery(), enabled: member() }));
	const sessions = createQuery(() => ({ ...accountSessionsQuery(), enabled: member() }));

	let passwordOpen = $state(false);

	const options = $derived({ locale: props().locale });
	const offline = $derived(props().offline === true);
	const viewOf = (read: { data: unknown; isError: boolean }): ReadView =>
		read.data !== undefined ? 'ready' : read.isError || offline ? 'failed' : 'loading';

	const passwordRow = $derived(
		methods.data ? buildSecurityPasswordRow(methods.data.passwordStatus, options) : null
	);
	const providerRows = $derived(
		methods.data ? buildSecurityProviderRows(methods.data.providers, options) : []
	);
	const sessionRows = $derived(
		sessions.data ? buildSecuritySessionRows(sessions.data, options) : []
	);

	const readMethods = () => client.invalidateQueries({ queryKey: authQueryKeys.signInMethods() });
	const readSessions = () =>
		client.invalidateQueries({ queryKey: authQueryKeys.accountSessions() });

	return {
		get methodsView(): ReadView {
			return viewOf(methods);
		},
		get sessionsView(): ReadView {
			return viewOf(sessions);
		},
		get passwordRow() {
			return passwordRow;
		},
		get providerRows() {
			return providerRows;
		},
		get sessionRows() {
			return sessionRows;
		},
		/** 🔴 U-168: the sign-in address exactly as the SERVER hides it (the session's own fact), or none. */
		get maskedEmail(): string | null {
			return session?.member?.maskedLoginEmail ?? null;
		},
		get passwordOpen() {
			return passwordOpen;
		},
		set passwordOpen(open: boolean) {
			passwordOpen = open;
		},
		retryMethods: () => void methods.refetch(),
		retrySessions: () => void sessions.refetch(),
		/** A passing word of the page («Η συσκευή αποσυνδέθηκε.»). */
		say(message: string) {
			toasts?.show({ message });
		},
		/** A passing word of something that did not go through, for a press that has no form of its own. */
		sayFailure(message: string) {
			toasts?.show({ message, tone: 'danger' });
		},
		/** The session ended under the page (`EC401`): the page learns it now and the sign-in opens over it. */
		sessionEnded() {
			session?.expire({});
		},
		readMethods: async () => void (await readMethods()),
		readSessions: async () => void (await readSessions()),
		/** The account has no password after all: the row's read is asked again and the row closes on its answer. */
		async passwordGone() {
			await readMethods();
			passwordOpen = false;
		},
		/**
		 * The password changed or was set: the sign-in methods AND the devices are asked again (every other device was
		 * signed out), and once the answers are back the row closes with its passing word.
		 */
		async passwordSaved(message: string) {
			await Promise.all([readMethods(), readSessions()]);
			passwordOpen = false;
			toasts?.show({ message });
		}
	};
}

export type Security = ReturnType<typeof useSecurity>;
