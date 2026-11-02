export type ConsentCategory = 'essential' | 'functional' | 'analytics' | 'marketing';

export type ConsentPlatform = 'app' | 'web';

/** One catalogued tool, as the registry describes it (the application's `ConsentToolFacts`). */
export type ConsentToolFacts = {
	id: string;
	category: ConsentCategory;
	platforms: ConsentPlatform[];
	policyUrl: string | null;
	translations: Record<'el' | 'en', { title: string; description: string }>;
};

export type ConsentRegistryFacts = {
	registryVersion: string;
	tools: ConsentToolFacts[];
};
