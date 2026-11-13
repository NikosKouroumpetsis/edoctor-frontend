import type { QueryClient } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import type { AppointmentDetailFacts, AppointmentFacts } from './types';

/**
 * After a change or a cancellation (screens 52, 53, P-W4 §4.3): the server's answer becomes the appointment's page at
 * once, and every list is read again (the visit may move to «Ιστορικό», U-137.6). 🔴 review w3-w2 R1 MAJOR-1: a hand
 * write into the cache marks its key first, so a sign-out takes it with the rest.
 */
export async function storeAppointmentDetail(
	client: QueryClient,
	appointment: AppointmentDetailFacts
): Promise<void> {
	client.setQueryDefaults(appointmentsQueryKeys.all, { meta: personalQueryMeta });
	client.setQueryData(appointmentsQueryKeys.detail(appointment.id), appointment);
	await client.invalidateQueries({ queryKey: appointmentsQueryKeys.lists() });
}

/** Rows of the person's appointments as the cache holds them: a tab's pages (infinite), or the scan's whole answer. */
type CachedRows = { items: AppointmentFacts[] };
type CachedAppointments = CachedRows | { pages: CachedRows[] };

/**
 * 🔴 Review w4-w6 R1 MAJOR-1 (screen 54's `201`): the visit just rated, written where every screen reads it BEFORE the
 * form goes back — its own page and its row of every list lose the invitation and name the review — so the 51 stands at
 * once with «Η κριτική σας» and never «Γράψτε κριτική», also while the new read is on its way or fails. Only what is in
 * the cache is rewritten (nothing made up); the keys are marked first, so a sign-out takes them (w3-w2 R1 MAJOR-1).
 */
export function storeAppointmentRated(
	client: QueryClient,
	appointmentId: string,
	ratingId: string | null
): void {
	const rated = <Row extends AppointmentFacts>(row: Row): Row =>
		row.id === appointmentId
			? { ...row, ratingInvitation: null, ratingId: ratingId ?? row.ratingId }
			: row;
	const ratedPage = <Page extends CachedRows>(page: Page): Page => ({
		...page,
		items: page.items.map(rated)
	});
	client.setQueryDefaults(appointmentsQueryKeys.all, { meta: personalQueryMeta });
	client.setQueryData<AppointmentDetailFacts>(
		appointmentsQueryKeys.detail(appointmentId),
		(held) => held && rated(held)
	);
	client.setQueriesData<CachedAppointments>(
		{ queryKey: appointmentsQueryKeys.lists() },
		(held) =>
			held && ('pages' in held ? { ...held, pages: held.pages.map(ratedPage) } : ratedPage(held))
	);
}
