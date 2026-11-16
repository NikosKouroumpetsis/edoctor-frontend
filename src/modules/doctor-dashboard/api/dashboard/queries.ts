import { queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { getDoctorDashboard } from './endpoints';

/**
 * 🔴 D-W51-10 · U-65.6: the account's doctor standing, in the browser only, for a member only (the caller enables it),
 * gone at a sign-out (`personalQueryMeta`). Asked again whenever the page comes back to the front: a licence the team
 * grants or revokes shows without a reload. A `401` / `403` is an answer, never retried.
 */
export function doctorDashboardQuery() {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.standing(),
		queryFn: async ({ signal }) => {
			const facts = await getDoctorDashboard(signal);
			if (!facts) throw new ApiError('Not a doctor dashboard', 0, '/doctor/me/dashboard');
			return facts;
		},
		refetchOnWindowFocus: 'always',
		meta: personalQueryMeta,
		retry: (count, error) =>
			!(error instanceof ApiError && [401, 403].includes(error.status)) && count < 1
	});
}
