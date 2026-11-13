<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Banner } from '$shared/ui/molecules/banner';
	import { ErrorState } from '$shared/ui/molecules/error-state';
	import { Button } from '$shared/ui/primitives/button';
	import { FieldMessage } from '$shared/ui/primitives/field-message';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import type { AccountDeletion } from '../hooks/use-deletion.svelte';
	import Lines from './lines.svelte';

	let {
		locale,
		flow,
		policyHref
	}: { locale: SupportedLocale; flow: AccountDeletion; policyHref: string } = $props();

	const options = $derived({ locale });
	const WAIT_ROWS = [0, 1, 2, 3];
</script>

<!-- Step 1 of «Διαγραφή λογαριασμού» (record §5.7, D-W45-30; `62-privacy/priv.js` `del()`, the application's preview):
     the introduction, then the server's own answer — a refusal first (and then NOTHING to press), «Τι σβήνεται αμέσως»
     (with «Κριτικές που γράψατε», D-W45-31), «Πριν συνεχίσετε», «Τι κρατάμε, γιατί και για πόσο», the policy that says
     the same, where the code will go, and «Αποστολή κωδικού». The server's words reach the page only as text (U-65.6). -->
<div data-testid="deletion-review" data-view={flow.view} class="flex flex-col">
	<p class="text-body-md text-muted-foreground">{m.profile_account_deletion_intro({}, options)}</p>
	{#if flow.view === 'loading'}
		<div
			data-testid="deletion-loading"
			aria-busy="true"
			aria-label={m.profile_account_deletion_loading({}, options)}
			class="mt-6"
		>
			<div aria-hidden="true" class="grid gap-3">
				{#each WAIT_ROWS as row (row)}
					<Skeleton class="h-control-sm w-full rounded-md" />
				{/each}
			</div>
		</div>
	{:else if flow.view === 'failed' || !flow.preview}
		<div class="mt-6">
			<ErrorState
				title={m.profile_account_deletion_read_failed_title({}, options)}
				description={m.profile_account_deletion_read_failed_body({}, options)}
				actionLabel={m.profile_account_deletion_read_failed_retry({}, options)}
				onActionPress={() => flow.retry()}
				titleAs="h3"
				testId="deletion-read-failed"
			/>
		</div>
	{:else}
		{@const preview = flow.preview}
		{#if preview.refusal}
			<Banner title={preview.refusal} tone="warning" class="mt-5" data-testid="deletion-refusal" />
		{/if}
		<Lines
			title={m.profile_account_deletion_removed_title({}, options)}
			lines={preview.removed}
			testId="deletion-removed"
		/>
		{#if preview.warnings.length > 0}
			<section data-testid="deletion-warnings" class="mt-6">
				<h3 class="text-title-sm font-semibold text-foreground">
					{m.profile_account_deletion_warnings_title({}, options)}
				</h3>
				<ul class="mt-3 flex flex-col gap-2">
					{#each preview.warnings as warning (warning.id)}
						<li
							data-testid={`deletion-warnings-${warning.id}`}
							class="rounded-md border border-warning/40 bg-warning/10 px-4 py-3.5 text-body-sm text-foreground"
						>
							{warning.text}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		<Lines
			title={m.profile_account_deletion_retained_title({}, options)}
			lines={preview.retained}
			testId="deletion-retained"
		/>
		<!-- The screen's address, already resolved (a module knows no route). -->
		<TextButton
			href={policyHref}
			label={m.profile_account_deletion_policy_link({}, options)}
			tone="primary"
			underline
			textClass="text-body-md"
			class="mt-4 self-start"
			data-testid="deletion-policy"
		/>
		{#if preview.codeNotice}
			<p data-testid="deletion-code-notice" class="mt-2 text-body-md text-muted-foreground">
				{preview.codeNotice}
			</p>
		{/if}
		{#if flow.sendError}
			<FieldMessage error={flow.sendError} data-testid="deletion-send-error" />
		{/if}
		{#if !preview.refusal}
			<div class="mt-6">
				<Button
					tone="contrast"
					bordered={false}
					label={m.profile_account_deletion_continue({}, options)}
					loading={flow.sending}
					textClass="text-body-lg"
					class="w-full px-6 tablet:w-auto"
					data-testid="deletion-send-code"
					onclick={() => flow.send()}
				/>
			</div>
		{/if}
	{/if}
</div>
