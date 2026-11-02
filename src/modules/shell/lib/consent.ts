import type { ConsentSnapshot } from '$shared/storage/consent-storage';
import type {
	ConsentCategory,
	ConsentRegistryFacts,
	ConsentToolFacts
} from '$modules/shell/api/consent';
import { consentCategories } from '$modules/shell/api/consent/map';

/**
 * The section order of «Διαχείριση προτιμήσεων»: essential first, then the opt-in categories (the application's) —
 * the registry's ONE list of categories (NIT-2, U-29).
 */
export const consentCategoryOrder: readonly ConsentCategory[] = consentCategories;

/** The tools that run on the web; an app-only tool never reaches this card. */
export function selectWebTools(
	registry: ConsentRegistryFacts | null | undefined
): ConsentToolFacts[] {
	return (registry?.tools ?? []).filter((tool) => tool.platforms.includes('web'));
}

/** Every tool allowed — «Αποδοχή όλων». */
export function buildAcceptAllChoices(tools: readonly ConsentToolFacts[]): Record<string, boolean> {
	return Object.fromEntries(tools.map((tool) => [tool.id, true]));
}

/** Only the essential tools allowed — «Μόνο απαραίτητα», the refusal as easy as the acceptance. */
export function buildEssentialOnlyChoices(
	tools: readonly ConsentToolFacts[]
): Record<string, boolean> {
	return Object.fromEntries(tools.map((tool) => [tool.id, tool.category === 'essential']));
}

/** The choices «Διαχείριση προτιμήσεων» starts from: stored answers, essentials on, the rest OFF (never pre-ticked). */
export function buildDraftChoices(
	tools: readonly ConsentToolFacts[],
	snapshot: ConsentSnapshot | null
): Record<string, boolean> {
	return Object.fromEntries(
		tools.map((tool) => [
			tool.id,
			tool.category === 'essential' || snapshot?.choices[tool.id] === true
		])
	);
}

export type ConsentPromptResolution = {
	shouldPrompt: boolean;
	/** The stored decision rewritten for this version (existing choices kept, departed tools dropped), or `null`. */
	reconciledSnapshot: ConsentSnapshot | null;
};

/**
 * 🔴 The application's `resolveConsentPrompt`: ask when there is no decision, or when a non-essential tool
 * appeared since the answered version. A registry that changed only essential entries or wording is reconciled
 * silently into `reconciledSnapshot` (the caller stores it). An empty or unknown registry never asks.
 */
export function resolveConsentPrompt({
	snapshot,
	tools,
	registryVersion
}: {
	snapshot: ConsentSnapshot | null;
	tools: readonly ConsentToolFacts[];
	registryVersion: string | null | undefined;
}): ConsentPromptResolution {
	if (!registryVersion || tools.length === 0) {
		return { shouldPrompt: false, reconciledSnapshot: null };
	}
	if (!snapshot) return { shouldPrompt: true, reconciledSnapshot: null };
	const hasUnansweredOptionalTool = tools.some(
		(tool) => tool.category !== 'essential' && !(tool.id in snapshot.choices)
	);
	if (hasUnansweredOptionalTool) return { shouldPrompt: true, reconciledSnapshot: null };
	const choices = buildDraftChoices(tools, snapshot);
	const isUnchanged =
		snapshot.registryVersion === registryVersion && isSameChoices(snapshot.choices, choices);
	return {
		shouldPrompt: false,
		reconciledSnapshot: isUnchanged ? null : { ...snapshot, choices, registryVersion }
	};
}

function isSameChoices(left: Record<string, boolean>, right: Record<string, boolean>): boolean {
	const leftKeys = Object.keys(left);
	return (
		leftKeys.length === Object.keys(right).length &&
		leftKeys.every((key) => left[key] === right[key])
	);
}
