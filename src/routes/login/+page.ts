import { readLoginParams } from '$modules/auth/lib/return-path';
import type { PageLoad } from './$types';

/** 🔴 U-65.6: the address's `next`, `do` and `error` are checked here, at the boundary; anything else is nothing. */
export const load: PageLoad = ({ url }) => ({ params: readLoginParams(url.searchParams) });
