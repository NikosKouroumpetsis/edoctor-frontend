import type { LegalDocumentEdition, LegalDocumentFacts } from '$modules/legal/api/page';
import type { LegalSlug } from '$modules/shell/config/legal';

/** A legal page's route data (`routes/legal/[slug]/+page.server.ts`): its slug, the edition read and the text. */
export type LegalScreenProps = {
	data: {
		slug: LegalSlug;
		edition: LegalDocumentEdition | undefined;
		document: LegalDocumentFacts;
	};
};
