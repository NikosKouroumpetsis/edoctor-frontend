import type {
	ApiOperationId,
	ApiRequestBody,
	DoctorNotificationEmailCodeSentView,
	DoctorOnboardingProgressView
} from '$shared/lib/api-client';
import { httpSessionGet, httpSessionPost, httpSessionPut } from '$shared/lib/http';
import { mapDoctorOnboardingProgress } from './map';
import type { DoctorOnboardingProgress, DoctorOnboardingWrite } from './types';

/** 🔴 U-112.2: the signed-in account's own sign-up (`GET /doctor/onboarding`, `no-store`), with the cookies. */
export function getDoctorOnboardingProgress(
	signal?: AbortSignal
): Promise<DoctorOnboardingProgressView> {
	return httpSessionGet<DoctorOnboardingProgressView>('/doctor/onboarding', { signal });
}

type Route = { method: 'POST' | 'PUT'; path: string; body: unknown };

/** One route of the contract and the body its operation takes (W-4: a body the contract does not take does not build). */
const route = <O extends ApiOperationId>(
	method: Route['method'],
	path: string,
	body: ApiRequestBody<O>
): Route => ({ method, path, body });

/** Where each write goes and what it carries (contract §5, the server's bodies one to one). */
function routeOf(write: DoctorOnboardingWrite): Route {
	switch (write.kind) {
		case 'start':
			return route<'startDoctorOnboarding'>('POST', '/doctor/onboarding/start', {});
		case 'basic-info':
			return route<'saveDoctorOnboardingBasicInfo'>(
				'POST',
				'/doctor/onboarding/basic-info',
				write.input
			);
		case 'notification-email':
			return route<'setDoctorOnboardingNotificationEmail'>(
				'PUT',
				'/doctor/onboarding/notification-email',
				{ notificationEmail: write.notificationEmail }
			);
		case 'verify-email':
			return route<'verifyDoctorOnboardingNotificationEmail'>(
				'POST',
				'/doctor/onboarding/notification-email/verify',
				write.input
			);
		case 'professional':
			return route<'saveDoctorOnboardingProfessional'>('POST', '/doctor/onboarding/professional', {
				professionalId: write.professionalId
			});
		case 'license':
			return route<'saveDoctorOnboardingLicense'>(
				'POST',
				'/doctor/onboarding/license',
				write.input
			);
		case 'office':
			return route<'saveDoctorOnboardingOffice'>('POST', '/doctor/onboarding/office', write.input);
		case 'service-pricing':
			return route<'saveDoctorOnboardingServicePricing'>(
				'POST',
				'/doctor/onboarding/service-pricing',
				write.input
			);
		case 'calendar':
			return route<'setDoctorOnboardingCalendar'>('POST', '/doctor/onboarding/calendar', {
				calendarCategory: write.category
			});
		case 'liability':
			return route<'saveDoctorOnboardingLiability'>(
				'POST',
				'/doctor/onboarding/liability',
				write.input
			);
		case 'activation-intent':
			return route<'saveDoctorOnboardingActivationIntent'>(
				'POST',
				'/doctor/onboarding/activation-intent',
				write.input
			);
		case 'complete':
			return route<'completeDoctorOnboarding'>('POST', '/doctor/onboarding/complete', write.input);
	}
}

/**
 * One step's write (D-W3-01: `start` answers with new cookies, which the browser keeps by itself; nothing here asks for
 * a refresh). Every write answers with the whole progress (MAJOR 3.6), handed on as FACTS — `null` for an answer that is
 * none (review w3-w6 R1 MINOR-1: the contract's view never leaves `api/`).
 */
export async function saveDoctorOnboardingStep(
	write: DoctorOnboardingWrite
): Promise<DoctorOnboardingProgress | null> {
	const { method, path, body } = routeOf(write);
	const view =
		method === 'PUT'
			? await httpSessionPut<DoctorOnboardingProgressView>(path, { body })
			: await httpSessionPost<DoctorOnboardingProgressView>(path, { body });
	return mapDoctorOnboardingProgress(view);
}

/**
 * Sends (or sends again) the code to the contact email the server keeps: its own answer, never the progress. 🔴 D-W3-39:
 * `?lang=` the page's, so the email is written in it.
 */
export async function sendDoctorOnboardingEmailCode(lang: string): Promise<boolean> {
	const body: ApiRequestBody<'sendDoctorOnboardingNotificationEmailCode'> = {};
	const answer = await httpSessionPost<DoctorNotificationEmailCodeSentView | null>(
		'/doctor/onboarding/notification-email/verification-code',
		{ params: { lang }, body }
	);
	return answer?.success === true;
}
