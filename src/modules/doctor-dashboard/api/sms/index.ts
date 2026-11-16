import { queryOptions } from '@tanstack/svelte-query';
import type { ApiResponseData } from '$shared/lib/api-client';
import { httpSessionGet } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { isFinalDoctorRefusal } from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';

/**
 * 🔴 Screen 72's «Ενημέρωση» (D-W51-70, U-197.1): what the doctor's own switches say of a confirmed appointment — the
 * SMS to the patient (`smsPatientConfirmed`, «SMS επιβεβαίωσης»). Nothing else of the settings is kept.
 */
export type DoctorSmsSettingsFacts = { confirmed: boolean };

/** What is left of the doctor's SMS packages (whole units, never below 0). */
export type DoctorSmsBalanceFacts = { remaining: number };

const record = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

/** 🔴 U-65.6: the switch only when the answer says `true`; anything else is «κλειστό» (no SMS promised). */
export function mapDoctorSmsSettings(
	view: ApiResponseData<'getMyNotificationSettings', 200> | null | undefined
): DoctorSmsSettingsFacts {
	return { confirmed: record(view)?.smsPatientConfirmed === true };
}

// More units than any package holds is no answer of the contract's.
const MAX_UNITS = 10_000_000;

/** The units left as a whole number of 0 or more; a broken answer is `null` (the summary then names no number). */
export function mapDoctorSmsBalance(
	view: ApiResponseData<'getMySmsBalance', 200> | null | undefined
): DoctorSmsBalanceFacts | null {
	const units = record(view)?.remainingUnits;
	return typeof units === 'number' && Number.isInteger(units) && units >= 0 && units <= MAX_UNITS
		? { remaining: units }
		: null;
}

/** `GET /notification/settings/me`, the session's own doctor, with the cookies. */
export async function getDoctorSmsSettings(signal?: AbortSignal): Promise<DoctorSmsSettingsFacts> {
	return mapDoctorSmsSettings(
		await httpSessionGet<ApiResponseData<'getMyNotificationSettings', 200>>(
			'/notification/settings/me',
			{ signal }
		)
	);
}

/** `GET /notification/sms-packages/me`, the session's own doctor, with the cookies. */
export async function getDoctorSmsBalance(
	signal?: AbortSignal
): Promise<DoctorSmsBalanceFacts | null> {
	return mapDoctorSmsBalance(
		await httpSessionGet<ApiResponseData<'getMySmsBalance', 200>>('/notification/sms-packages/me', {
			signal
		})
	);
}

/** Screen 72: the doctor's SMS switch, read when the screen opens; personal, gone at a sign-out. */
export function doctorSmsSettingsQuery() {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.smsSettings(),
		queryFn: ({ signal }) => getDoctorSmsSettings(signal),
		staleTime: 0,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/** Screen 72: what is left of the SMS packages, read when the screen opens; personal, gone at a sign-out. */
export function doctorSmsBalanceQuery() {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.smsBalance(),
		queryFn: ({ signal }) => getDoctorSmsBalance(signal),
		staleTime: 0,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}
