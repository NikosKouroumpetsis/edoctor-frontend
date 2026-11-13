import { useQueryClient } from '@tanstack/svelte-query';
import { getSessionOptional } from '$shared/state/session';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import {
	readBookingProfileFailure,
	updateBookingPatientProfile,
	updatePatientIdentifiers
} from '$modules/appointments/api/patient';
import {
	readPhoneChangeFailure,
	resendBookingPhone,
	startBookingPhone,
	verifyBookingPhone
} from '$modules/appointments/api/phone';
import {
	keepLoginEmailMask,
	readLoginEmailChangeFailure,
	resendLoginEmailChange,
	startLoginEmailChange,
	verifyLoginEmailChange
} from '$modules/auth/api/login-email';
import { parseIdentifier } from '$modules/auth/lib/identifier';
import { renameKnownAccountEmail } from '$modules/auth/lib/known-account';
import type { PersonalPorts } from '$modules/profile/ui/personal';

/**
 * Wave 4.5 · screen 58 «Προσωπικά στοιχεία»: what the profile module's page asks of the modules that own each call (a
 * module never imports another, so the screen composes them) — the patient's own writes and the mobile's challenge
 * (the appointments module's, as the booking uses them), the sign-in email's challenge (the auth module's) and the
 * sign-in's own rule for a mobile. 🔴 U-168: a value passes through here on its way to the server and is kept nowhere.
 */
export function usePersonalPorts(): PersonalPorts {
	const client = useQueryClient();
	const session = getSessionOptional();

	return {
		saveProfile: (patch) => updateBookingPatientProfile(patch),
		saveIdentifier: (kind, value) =>
			updatePatientIdentifiers(kind === 'amka' ? { amka: value } : { afm: value }),
		writeFailureOf: readBookingProfileFailure,
		email: {
			start: startLoginEmailChange,
			resend: resendLoginEmailChange,
			// D-W45-15: the answer's own mask is the session's at once (the cookies of the answer carry this device on),
			// and what «Καλωσορίσατε ξανά» remembers of the account follows it — the mask alone, as a sign-in keeps it.
			verify: async (code) => {
				const { masked } = await verifyLoginEmailChange(code);
				keepLoginEmailMask(client, masked);
				renameKnownAccountEmail(masked);
			},
			failureOf: readLoginEmailChangeFailure
		},
		phone: {
			start: startBookingPhone,
			resend: resendBookingPhone,
			verify: verifyBookingPhone,
			failureOf: readPhoneChangeFailure
		},
		toMobilePhone: (dialCode, typed) => {
			const identifier = parseIdentifier(typed, dialCode);
			return identifier && 'mobilePhone' in identifier ? identifier.mobilePhone : null;
		},
		// The booking's own facts of the person and its readiness follow (as after the booking's own writes), and the
		// session is read again.
		refresh: async () => {
			void client.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
			await session?.retryRead();
		}
	};
}
