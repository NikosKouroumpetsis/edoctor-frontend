import { httpSessionGet, httpSessionPatch } from '$shared/lib/http';
import { mapDoctorLinks, toDoctorLinksBody } from './map';
import type { DoctorLinksAnswerView, DoctorLinksFacts, DoctorLinksView } from './types';

const BASE_PATH = '/doctor/profile/base';

/**
 * D-W52-70 (screen 82): the four links of the session's own doctor, read from the base profile (`no-store`, with the
 * cookies). Nothing in the request names a doctor (the backoffice's `tenantUserId` is never sent). `undefined` for an
 * answer that is no base profile.
 */
export async function getDoctorLinks(signal?: AbortSignal): Promise<DoctorLinksFacts | undefined> {
	return mapDoctorLinks(await httpSessionGet<DoctorLinksView>(BASE_PATH, { signal }));
}

/**
 * 🔴 D-W52-67 / 70: the four links in ONE call of the existing `PATCH /doctor/profile/base` — only those four fields,
 * each a link or `null`. The server checks every one again and writes nothing when it refuses any. The links as it now
 * keeps them; `undefined` for an answer that is no base profile.
 */
export async function updateDoctorLinks(
	links: DoctorLinksFacts
): Promise<DoctorLinksFacts | undefined> {
	return mapDoctorLinks(
		await httpSessionPatch<DoctorLinksAnswerView>(BASE_PATH, { body: toDoctorLinksBody(links) })
	);
}
