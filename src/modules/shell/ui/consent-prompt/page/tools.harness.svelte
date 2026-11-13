<script lang="ts">
	import { untrack } from 'svelte';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { ConsentDecision, setConsentDecision } from '$shared/state/consent';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, Toaster, ToastState } from '$shared/ui/molecules/toast';
	import { useConsentSummary } from '../hooks/use-consent-summary.svelte';
	import ConsentPrompt from './index.svelte';
	import ConsentTools from './tools.svelte';

	let {
		locale = 'el',
		session,
		prompt = true,
		page = true,
		onSaved
	}: {
		locale?: SupportedLocale;
		session?: Session;
		/** The frame's cookie card and its window, beside the page — as on the site. */
		prompt?: boolean;
		/** The page «Εργαλεία τρίτων και cookies» (off: only the row's line of «Απόρρητο»). */
		page?: boolean;
		onSaved?: () => void;
	} = $props();

	// The tree's contexts, as the site's frame sets them (`site-frame`).
	if (untrack(() => session)) setSession(untrack(() => session) as Session);
	setConsentDecision(new ConsentDecision());
	const toasts = setToasts(new ToastState());
	const summary = useConsentSummary(
		() => locale,
		() => true
	);
</script>

<!-- Tests only: the three surfaces of the ONE decision on one page tree — the cookie card (with its window), the page
     of screen 62 and the line of the row of «Απόρρητο». -->
<p data-testid="summary-line">{summary.line ?? '…'}</p>
{#if prompt}
	<ConsentPrompt />
{/if}
{#if page}
	<ConsentTools {locale} onSaved={() => onSaved?.()} />
{/if}
<Toaster {toasts} />
