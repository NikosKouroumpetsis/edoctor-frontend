import { ApiError, httpSessionGet, httpSessionPut } from '$shared/lib/http';
import { DoctorCredentialRefusal } from './failure';
import { mapDoctorCredentials, toDoctorCredentialsBody } from './map';
import type {
	DoctorCredentialFacts,
	DoctorCredentialGroupChange,
	DoctorCredentialKind,
	DoctorCredentialsView
} from './types';

const CREDENTIALS_PATH = '/doctor/profile/credentials';

/**
 * D-W52-61: the biography of the session's own doctor, every row in the server's order (`no-store`, with the cookies).
 * Nothing in the request names a doctor (the backoffice's `tenantUserId` is never sent) or a language: the rows come
 * with every language and the map keeps the Greek. `null` for an answer that is no biography.
 */
export async function getDoctorCredentials(
	signal?: AbortSignal
): Promise<DoctorCredentialFacts[] | null> {
	return mapDoctorCredentials(
		await httpSessionGet<DoctorCredentialsView>(CREDENTIALS_PATH, { signal })
	);
}

/**
 * 🔴 D-W52-63: ONE save of one group. The server keeps a group as the rows it is sent, so the biography is READ AGAIN
 * first and the change is made on THAT answer — never on what a page read earlier (a row saved meanwhile elsewhere is
 * not written over). The whole group goes back in the order it was written (`position`), in Greek alone. Nothing is
 * sent when the read fails or the change has nothing to stand on (`DoctorCredentialRefusal`). Answers the WHOLE
 * biography as the server now keeps it; `null` for an answer that is no biography.
 */
export async function changeDoctorCredentialGroup(
	kind: DoctorCredentialKind,
	change: DoctorCredentialGroupChange
): Promise<DoctorCredentialFacts[] | null> {
	const fresh = mapDoctorCredentials(await httpSessionGet<DoctorCredentialsView>(CREDENTIALS_PATH));
	if (!fresh) throw new ApiError('Not a biography', 0, CREDENTIALS_PATH);
	const written = fresh
		.filter((row) => row.kind === kind)
		.sort((one, other) => one.position - other.position);
	const next = change(written);
	if ('refusal' in next) throw new DoctorCredentialRefusal(next.refusal);
	return mapDoctorCredentials(
		await httpSessionPut<DoctorCredentialsView>(CREDENTIALS_PATH, {
			body: toDoctorCredentialsBody(kind, next.items)
		})
	);
}
