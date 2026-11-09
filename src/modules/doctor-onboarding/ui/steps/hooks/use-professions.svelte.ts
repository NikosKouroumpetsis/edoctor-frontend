import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { doctorOnboardingProfessionsQuery } from '$modules/doctor-onboarding/api/professions';
import {
	buildDoctorProfessionOptions,
	type DoctorProfessionOption
} from '$modules/doctor-onboarding/lib/professions';

/** The specialties' catalogue in the page's language (B-6), read once per tab, only for a signed-in doctor. */
export function useDoctorProfessions(locale: () => 'el' | 'en', signedIn: () => boolean) {
	const read = createQuery(() => ({
		...doctorOnboardingProfessionsQuery(),
		enabled: browser && signedIn()
	}));
	const options = $derived<DoctorProfessionOption[]>(
		buildDoctorProfessionOptions(read.data ?? [], locale())
	);
	return {
		get options() {
			return options;
		},
		get loading() {
			return read.isPending && read.fetchStatus !== 'idle';
		},
		get failed() {
			return read.isError;
		},
		retry() {
			void read.refetch();
		}
	};
}
