import { m } from '$paraglide/messages.js';
import { resolveMediaUrl } from '$shared/lib/http';
import { withDoctorTitle } from '$shared/lib/text';
import type { MessagingCounterpartView } from '$shared/lib/api-client';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** The other person as a row, a bar and a note draw them; a patient shows a name and nothing else (U-84.3). */
export type CounterpartFacts = {
	name: string;
	/**
	 * 🔴 U-99.1: the name inside a sentence. «Dr. …» when the other person is this conversation's doctor: `kind` is the
	 * conversation's side as the server says it, never a guess from the name. A patient's name, and no name, as they are.
	 */
	sentenceName: string;
	/**
	 * Their specialty; a patient's is empty — 🔴 D-W51-86: the appointment's line takes its place, never «Ασθενής».
	 */
	subtitle: string;
	initial: string;
	imageUrl: string | null;
	isDoctor: boolean;
	/** A doctor's public page. */
	slug: string | null;
};

/** The first letter of a name, past a title («Dr. Athena» ⇒ «A»), a whole character whatever it is made of. */
export function nameInitial(name: string): string {
	const bare = name.replace(/^dr\.?\s*/iu, '').trim();
	return ([...bare][0] ?? '').toLocaleUpperCase();
}

/** A patient's two initials, as the doctor's lists draw them («Ιωάννα Καρρά» ⇒ «ΙΚ»), whole characters. */
export function nameInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/u)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => [...word][0] ?? '')
		.join('')
		.toLocaleUpperCase();
}

export function buildCounterpartFacts(
	counterpart: MessagingCounterpartView | null | undefined,
	locale: SupportedLocale
): CounterpartFacts {
	const isDoctor = counterpart?.kind === 'doctor';
	const known = counterpart?.fullName?.trim();
	const name = known || m.messages_person_unknown({}, { locale });
	return {
		name,
		sentenceName: isDoctor && known ? withDoctorTitle(known) : name,
		subtitle: isDoctor ? (counterpart?.specialty?.trim() ?? '') : '',
		initial: isDoctor ? nameInitial(name) : nameInitials(name),
		imageUrl: isDoctor && counterpart?.photoUrl ? resolveMediaUrl(counterpart.photoUrl) : null,
		isDoctor,
		slug: isDoctor ? (counterpart?.slug ?? null) : null
	};
}
