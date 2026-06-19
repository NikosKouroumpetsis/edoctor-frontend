import type { SectionId } from '../../types';

export const searchDoctorsQueryKeys = {
	all: ['search-doctors'] as const,
	categoryScope: (categoryId: string, lang: string) =>
		[...searchDoctorsQueryKeys.all, 'category-scope', categoryId, lang] as const,
	homeSection: (sectionId: SectionId, lang: string, scope: unknown) =>
		[...searchDoctorsQueryKeys.all, 'home-section', sectionId, lang, scope] as const
};
