import type { ConsentPublicRegistryResponseView, ConsentToolView } from '$shared/lib/api-client';
import type {
	ConsentCategory,
	ConsentPlatform,
	ConsentRegistryFacts,
	ConsentToolFacts
} from './types';

/** The registry's categories, in the card's order (essential first): the ONE list (NIT-2, U-29). */
export const consentCategories: readonly ConsentCategory[] = [
	'essential',
	'functional',
	'analytics',
	'marketing'
];
const consentPlatforms: readonly ConsentPlatform[] = ['app', 'web'];

type ToolTranslation = { title?: string | null; description?: string | null } | null | undefined;

/**
 * 🔴 The application's `mapConsentRegistryToFacts`, rule for rule (the trust boundary): a tool without an id, with an
 * unknown category, without a known platform or without both languages is dropped — a tool the site cannot
 * describe is a tool the visitor cannot consent to. `null` is «no usable version»: keep the bundled registry.
 */
export function mapConsentRegistryToFacts(
	data: ConsentPublicRegistryResponseView | null | undefined
): ConsentRegistryFacts | null {
	if (!data || typeof data !== 'object') return null;
	const registryVersion =
		typeof data.registryVersion === 'string' ? data.registryVersion.trim() : '';
	if (registryVersion.length === 0) return null;
	const tools = Array.isArray(data.tools) ? data.tools : [];
	return {
		registryVersion,
		tools: tools
			.map((tool) => mapToolToFacts(tool))
			.filter((tool): tool is ConsentToolFacts => tool !== null)
	};
}

function mapToolToFacts(tool: ConsentToolView | null | undefined): ConsentToolFacts | null {
	if (!tool || typeof tool !== 'object') return null;
	const id = typeof tool.id === 'string' ? tool.id.trim() : '';
	const category = consentCategories.find((known) => known === tool.category);
	if (id.length === 0 || !category) return null;
	const platforms = (Array.isArray(tool.platforms) ? tool.platforms : []).filter(
		(platform): platform is ConsentPlatform => consentPlatforms.some((known) => known === platform)
	);
	if (platforms.length === 0) return null;
	const translations = tool.translations as
		| Partial<Record<'el' | 'en', ToolTranslation>>
		| null
		| undefined;
	const el = mapTranslation(translations?.el);
	const en = mapTranslation(translations?.en);
	if (!el || !en) return null;
	return {
		category,
		id,
		platforms,
		policyUrl:
			typeof tool.policyUrl === 'string' && tool.policyUrl.length > 0 ? tool.policyUrl : null,
		translations: { el, en }
	};
}

function mapTranslation(translation: ToolTranslation) {
	const title = typeof translation?.title === 'string' ? translation.title.trim() : '';
	if (title.length === 0) return null;
	return {
		title,
		description: typeof translation?.description === 'string' ? translation.description : ''
	};
}
