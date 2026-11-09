import type { DoctorOnboardingScreen } from '$modules/doctor-onboarding/lib/steps';

/** The sign-up's route data (D-W3-28): the page its address names, from the closed list. */
export type DoctorOnboardingScreenData = { screen: DoctorOnboardingScreen };

export type DoctorOnboardingScreenProps = { data: DoctorOnboardingScreenData };
