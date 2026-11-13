import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { profileQueryKeys } from '$modules/profile/api/keys';
import {
	accountPersonQuery,
	readAccountWriteFailure,
	updateAccountBirthDate,
	updateAccountGender
} from '$modules/profile/api/user';
import { buildPersonalRows, toBirthDateInstant } from '$modules/profile/lib/personal';
import type {
	PersonalGender,
	PersonalIdKind,
	PersonalPerson,
	PersonalRowId,
	PersonalWriteFailure
} from '$modules/profile/types';
import type { PersonalPageProps } from '../types';

/**
 * Screen 58 (record §5.3): who the page reads — the session's own facts of the person (the names and the server's
 * masks) and the account's gender and date of birth (`GET /user/me`) — which ONE row is open, and what each row's
 * write is. A write answers why it was refused, or `null`; a session that ended opens the sign-in (U-84). 🔴 U-168:
 * nothing a person types is kept here — it lives in the open row's own form and goes with it.
 */
export function usePersonal(props: () => PersonalPageProps) {
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const client = useQueryClient();
	const account = createQuery(() => ({
		...accountPersonQuery(),
		enabled: browser && session?.isMember === true
	}));

	let openRow = $state<PersonalRowId | null>(null);

	const person = $derived.by((): PersonalPerson | null => {
		const member = session?.member;
		if (!member || !account.data) return null;
		return {
			hasPatientProfile: member.hasPatientProfile === true,
			firstName: member.firstName ?? null,
			lastName: member.lastName ?? null,
			gender: account.data.gender,
			birthDate: account.data.birthDate,
			maskedEmail: member.maskedLoginEmail ?? null,
			maskedPhone: member.maskedLoginPhone ?? null,
			maskedAmka: member.maskedAmka ?? null,
			maskedAfm: member.maskedAfm ?? null
		};
	});
	const rows = $derived(person ? buildPersonalRows(person, { locale: props().locale }) : []);
	const failed = $derived(
		!person && (account.isError || (props().offline === true && account.data === undefined))
	);

	async function write(
		run: () => Promise<void>,
		read: (error: unknown) => PersonalWriteFailure
	): Promise<PersonalWriteFailure | null> {
		try {
			await run();
			return null;
		} catch (error) {
			const failure = read(error);
			if (failure === 'session') session?.expire({});
			return failure;
		}
	}

	return {
		get view(): 'loading' | 'failed' | 'ready' {
			return person ? 'ready' : failed ? 'failed' : 'loading';
		},
		get person() {
			return person;
		},
		get rows() {
			return rows;
		},
		get openRow() {
			return openRow;
		},
		setOpen(row: PersonalRowId, open: boolean) {
			if (open) openRow = row;
			else if (openRow === row) openRow = null;
		},
		retry: () => void account.refetch(),
		/** A passing word of the page («Στείλαμε νέο κωδικό.»). */
		say(message: string) {
			toasts?.show({ message });
		},
		/** The session ended under an open row (`EC401`): the page learns it now and the sign-in opens over it. */
		sessionEnded() {
			session?.expire({});
		},
		/**
		 * A row's change was kept: every read of the person is asked again, and once the answers are back the row closes
		 * on what the server holds now, with its passing word.
		 */
		async done(row: PersonalRowId, message: string) {
			await Promise.all([
				props().ports.refresh(),
				client.invalidateQueries({ queryKey: profileQueryKeys.accountPerson() })
			]);
			if (openRow === row) openRow = null;
			toasts?.show({ message });
		},
		saveName: (patch: { firstName: string; lastName: string }) =>
			write(() => props().ports.saveProfile(patch), props().ports.writeFailureOf),
		/** A patient's day of birth is the patient's own write; an account without that profile writes its own. */
		saveBirthDate(day: string) {
			const dateOfBirth = toBirthDateInstant(day);
			return person?.hasPatientProfile
				? write(() => props().ports.saveProfile({ dateOfBirth }), props().ports.writeFailureOf)
				: write(() => updateAccountBirthDate(dateOfBirth), readAccountWriteFailure);
		},
		saveGender: (gender: PersonalGender) =>
			write(() => updateAccountGender(gender), readAccountWriteFailure),
		/** A new ΑΜΚΑ / ΑΦΜ, or `null`: «Αφαίρεση». */
		saveIdentifier: (kind: PersonalIdKind, value: string | null) =>
			write(() => props().ports.saveIdentifier(kind, value), props().ports.writeFailureOf)
	};
}

export type Personal = ReturnType<typeof usePersonal>;
