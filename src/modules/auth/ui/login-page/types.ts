import type { AuthLoginParams } from '$modules/auth/types';

export type AuthLoginPageProps = {
	/** The address's `next`, `do`, `error` and `via`, already checked by the route's `load`. */
	params: AuthLoginParams;
};
