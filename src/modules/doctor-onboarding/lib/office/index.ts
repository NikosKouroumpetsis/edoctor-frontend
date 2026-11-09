import { DOCTOR_ONBOARDING_FLOOR } from '$modules/doctor-onboarding/config';

/**
 * 🔴 D-W3-26 (record §6.8, review w3-w1 MINOR-4): the floor the «Πώς θα σας βρουν» screen starts on and sends — the
 * server's, or the ground floor (0) when it has none (`null`, never set) or one outside the schema. The shared
 * `Stepper` always gets a number, so it never shows «Ισόγειο» for an empty value it would then send as nothing.
 */
export function officeFloorOf(serverFloor: number | null | undefined): number {
	return typeof serverFloor === 'number' &&
		Number.isInteger(serverFloor) &&
		serverFloor >= DOCTOR_ONBOARDING_FLOOR.min &&
		serverFloor <= DOCTOR_ONBOARDING_FLOOR.max
		? serverFloor
		: DOCTOR_ONBOARDING_FLOOR.start;
}
