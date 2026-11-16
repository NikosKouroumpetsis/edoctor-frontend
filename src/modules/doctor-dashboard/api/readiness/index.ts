import { queryOptions } from '@tanstack/svelte-query';
import type { ApiResponseData } from '$shared/lib/api-client';
import { ApiError, httpSessionGet } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';

type ReadinessView = ApiResponseData<'getDoctorActivationReadiness', 200>;

/** A blocker's code, the contract's own enum (`DoctorActivationBlockerCode`). */
export type DoctorReadinessBlockerCode = ReadinessView['blockers'][number]['code'];

/**
 * What «Σήμερα» needs of the doctor's readiness (D-W51-22 (4)): the codes of what blocks, nothing else of the answer
 * (U-65.6: the facts behind them stay on the server).
 */
export type DoctorReadinessFacts = { blockers: DoctorReadinessBlockerCode[] };

/** U-65.6: only the blockers' codes that are words, each once; a broken answer blocks nothing it did not name. */
export function mapDoctorReadiness(view: ReadinessView | null | undefined): DoctorReadinessFacts {
	const blockers = Array.isArray(view?.blockers) ? view.blockers : [];
	const codes = blockers.flatMap((blocker) => {
		const code = (blocker as { code?: unknown } | null)?.code;
		return typeof code === 'string' && /^[A-Z_]{1,64}$/u.test(code)
			? [code as DoctorReadinessBlockerCode]
			: [];
	});
	return { blockers: [...new Set(codes)] };
}

/** `GET /doctor/activation/readiness` for the session's own doctor, with the cookies. */
export async function getDoctorReadiness(signal?: AbortSignal): Promise<DoctorReadinessFacts> {
	return mapDoctorReadiness(
		await httpSessionGet<ReadinessView>('/doctor/activation/readiness', { signal })
	);
}

/**
 * D-W51-22 (4): asked only when «Σήμερα» has no appointment at all (the caller enables it), again when the page comes
 * back to the front (hours set in another tab show at once); personal, gone at a sign-out. A refusal is an answer.
 */
export function doctorReadinessQuery() {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.readiness(),
		queryFn: ({ signal }) => getDoctorReadiness(signal),
		refetchOnWindowFocus: 'always',
		retry: (failures, error) =>
			!(error instanceof ApiError && [401, 403, 404].includes(error.status)) && failures < 1,
		meta: personalQueryMeta
	});
}
