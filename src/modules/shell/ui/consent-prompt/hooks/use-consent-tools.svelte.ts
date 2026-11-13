import { browser } from '$app/environment';
import { createQuery } from '@tanstack/svelte-query';
import { ConsentDecision, getConsentDecisionOptional } from '$shared/state/consent';
import type { ConsentSnapshot } from '$shared/storage/consent-storage';
import { getConsentRegistry } from '$modules/shell/api/consent';
import { fallbackConsentRegistry } from '$modules/shell/config/consent-fallback-registry';
import { selectWebTools } from '$modules/shell/lib/consent';

const REGISTRY_STALE_MS = 10 * 60 * 1000;

/**
 * The consent's ONE catalogue and ONE decision, for every surface that shows them (the cookie card and its window, the
 * page «Εργαλεία τρίτων και cookies», the line of «Απόρρητο»): the registry (anonymous GET, checked at the boundary;
 * one cache entry) with the bundled one behind it, the web's tools of it, and the decision this browser keeps — the
 * tree's own (`ConsentDecision`), so what one surface saves the others show.
 */
export function useConsentTools(options: { enabled?: () => boolean } = {}) {
	const decision = getConsentDecisionOptional() ?? new ConsentDecision();
	const registryQuery = createQuery(() => ({
		queryKey: ['consent', 'registry'],
		queryFn: ({ signal }: { signal: AbortSignal }) => getConsentRegistry(signal),
		// A surface that is not on the page asks nothing (the row of «Απόρρητο» off its page).
		enabled: browser && (options.enabled?.() ?? true),
		staleTime: REGISTRY_STALE_MS
	}));
	// The application's `consentRegistryQuery`: the bundled registry when the served one cannot be read, has no usable
	// version (`null`) or no tool left after the boundary; nothing until it answers.
	const registry = $derived.by(() => {
		// Both read every time: a query result tells its changes only for the fields that were read.
		const data = registryQuery.data;
		const failed = registryQuery.isError;
		if (failed) return fallbackConsentRegistry;
		if (data === undefined) return null;
		return data && data.tools.length > 0 ? data : fallbackConsentRegistry;
	});
	const tools = $derived(selectWebTools(registry));

	// The decision this browser keeps (first party, no personal data); read once in the browser.
	$effect(() => decision.load());

	return {
		get registry() {
			return registry;
		},
		get tools() {
			return tools;
		},
		get snapshot() {
			return decision.snapshot;
		},
		/** The browser's storage has been read. */
		get read() {
			return decision.loaded;
		},
		/** Keeps `choices` for the registry's version; `false` while no registry is known (nothing is written). */
		save(choices: Record<string, boolean>): boolean {
			if (!registry) return false;
			decision.save({ registryVersion: registry.registryVersion, choices });
			return true;
		},
		/** A stored decision rewritten for a newer version (the prompt's silent reconciliation). */
		keep(snapshot: ConsentSnapshot) {
			decision.save(snapshot);
		}
	};
}
