<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import type { SecurityProviderRow } from '$modules/auth/types';
	import type { Security } from '../hooks/use-security.svelte';
	import Part from './part.svelte';
	import ReadFailure from './read-failure.svelte';
	import Row from './row.svelte';
	import Skeleton from './skeleton.svelte';
	import UnlinkDialog from './unlink-dialog.svelte';

	let { locale, security }: { locale: SupportedLocale; security: Security } = $props();

	const options = $derived({ locale });
	const dimmed = $derived(security.passwordOpen);

	// The provider the window asks about, held as it was when asked: the window keeps its words while it closes.
	let subject = $state.raw<SecurityProviderRow | null>(null);
	let asking = $state(false);
	// 🔴 D-W45-38: the provider whose «Αποσύνδεση» was refused — by what the read said, or by the server at the press.
	let refused = $state<string | null>(null);

	function ask(row: SecurityProviderRow) {
		if (dimmed) return;
		// 🔴 D-W45-38: a provider that may not go opens no question and sends no request — the row says why.
		if (!row.canUnlink) {
			refused = row.slug;
			return;
		}
		refused = null;
		subject = row;
		asking = true;
	}
</script>

<!-- Part 2 «Σύνδεση με Google ή Apple» (record §5.4, Ε1 Α): only what is linked shows — «Google · Συνδεδεμένο ·
     Αποσύνδεση» — and with none, «Κανένας συνδεδεμένος λογαριασμός». There is no «Σύνδεση» from here: signing in with
     the provider links it again. 🔴 D-W45-38: «Αποσύνδεση» of a provider that would leave no way in says so under the
     row — no window, no request. The rows fade while the password's row is open. -->
<Part title={m.auth_security_providers_title({}, options)} testId="security-part-providers">
	{#if security.methodsView === 'loading'}
		<Skeleton
			label={m.auth_security_providers_title({}, options)}
			testId="security-providers-loading"
		/>
	{:else if security.methodsView === 'failed'}
		<ReadFailure {locale} part="providers" onRetry={() => security.retryMethods()} />
	{:else if security.providerRows.length === 0}
		<Row
			title={m.auth_security_providers_empty_title({}, options)}
			value={m.auth_security_providers_empty_body({}, options)}
			{dimmed}
			testId="security-providers-empty"
		/>
	{:else}
		{#each security.providerRows as row (row.provider)}
			{@const titleId = `security-provider-title-${row.slug}`}
			<Row
				title={row.name}
				{titleId}
				value={row.status}
				{dimmed}
				testId={`security-provider-${row.slug}`}
			>
				{#snippet action()}
					<TextButton
						label={m.auth_security_providers_unlink({}, options)}
						underline
						tone="foreground"
						textClass="text-body-sm underline-offset-3"
						aria-describedby={titleId}
						aria-haspopup={row.canUnlink ? 'dialog' : undefined}
						aria-disabled={dimmed || undefined}
						tabindex={dimmed ? -1 : undefined}
						data-testid={`security-provider-${row.slug}-unlink`}
						class="-my-3.5 shrink-0"
						onclick={() => ask(row)}
					/>
				{/snippet}
				{#if refused === row.slug}
					<p
						role="alert"
						data-testid={`security-provider-${row.slug}-refusal`}
						class="mt-2 max-w-text text-body-sm text-foreground"
					>
						{row.refusal}
					</p>
				{/if}
			</Row>
		{/each}
	{/if}
</Part>
{#if subject}
	{@const asked = subject}
	<UnlinkDialog
		bind:open={asking}
		{locale}
		{security}
		row={asked}
		onRefused={() => (refused = asked.slug)}
	/>
{/if}
