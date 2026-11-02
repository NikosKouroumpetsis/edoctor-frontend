import type { HelpFaqSource } from '$modules/help/types';

/** The help centre's route data (`routes/help/+page.server.ts`): the CMS page `faq` as read. */
export type HelpScreenProps = {
	data: { faq: HelpFaqSource };
};
