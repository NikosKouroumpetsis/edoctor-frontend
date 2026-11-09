import { error } from '@sveltejs/kit';
import { readDoctorOnboardingScreen } from '$modules/doctor-onboarding/lib/steps';
import type { PageLoad } from './$types';

/**
 * 🔴 Wave 3 · the doctor's sign-up, screens 33–42 (D-W3-28, P-W3 §3.1): ONE route, the application's page names as a
 * closed list — the overview at `/doctor/onboarding`, every step and every screen a step opens under it; anything else
 * is a 404 (U-65.6). Nothing is read here: the cookies live on the API, so the person's sign-up is the browser's read.
 */
export const load: PageLoad = ({ params }) => {
	const screen = readDoctorOnboardingScreen(params.step);
	if (screen === undefined) error(404);
	return { screen };
};
