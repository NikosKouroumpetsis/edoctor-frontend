import type { AuthLoginParams } from '$modules/auth/types';

/** The sign-in page's route data (`routes/login/+page.ts`): the address's parts, checked. */
export type LoginScreenProps = {
	data: { params: AuthLoginParams };
};
