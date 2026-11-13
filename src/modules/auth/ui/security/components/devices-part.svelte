<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Badge } from '$shared/ui/primitives/badge';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { endAccountSession, readSessionEndFailure } from '$modules/auth/api/sessions';
	import { securityActionFailureWords } from '$modules/auth/lib/security';
	import type { SecuritySessionRow } from '$modules/auth/types';
	import type { Security } from '../hooks/use-security.svelte';
	import Part from './part.svelte';
	import ReadFailure from './read-failure.svelte';
	import Skeleton from './skeleton.svelte';

	let { locale, security }: { locale: SupportedLocale; security: Security } = $props();

	const options = $derived({ locale });
	const dimmed = $derived(security.passwordOpen);
	// The place in the list of the device whose «Αποσύνδεση» is out: until it answers no other press is taken.
	let ending = $state<number | null>(null);

	async function end(row: SecuritySessionRow) {
		// 🔴 D-W45-40: THIS device is never ended from here (the «Προφίλ» has its own «Αποσύνδεση»).
		if (dimmed || row.current || ending !== null) return;
		ending = row.index;
		try {
			await endAccountSession(row.sessionId);
		} catch (error) {
			const kind = readSessionEndFailure(error);
			if (kind === 'session') security.sessionEnded();
			// Signed in no more (ended elsewhere, expired), or this very device: the list is stale — read again, no word.
			else if (kind === 'gone' || kind === 'current') await security.readSessions();
			else security.sayFailure(securityActionFailureWords(kind, options));
			ending = null;
			return;
		}
		try {
			await security.readSessions();
			security.say(m.auth_security_messages_device_ended({}, options));
		} finally {
			ending = null;
		}
	}
</script>

<!-- Part 3 «Συσκευές» (record §5.4, Ε2 Α; `59-security/sec.css` `.c-dev`): every device the account is signed in from —
     its glyph, «συσκευή · browser ή εφαρμογή» composed on the page (D-W45-35), «ΑΥΤΗ Η ΣΥΣΚΕΥΗ» on this one (always
     first), when it was last active — and «Αποσύνδεση» on every OTHER one (🔴 D-W45-40: never on this one). One press
     is one request; after it «Η συσκευή αποσυνδέθηκε.» and the list is read again. No city. The session's id stays in
     the page's memory: it is in no attribute and no address. The rows fade while the password's row is open. -->
<Part
	title={m.auth_security_devices_title({}, options)}
	help={m.auth_security_devices_help({}, options)}
	testId="security-part-devices"
>
	{#if security.sessionsView === 'loading'}
		<Skeleton
			label={m.auth_security_devices_title({}, options)}
			rows={2}
			testId="security-devices-loading"
		/>
	{:else if security.sessionsView === 'failed'}
		<ReadFailure {locale} part="devices" onRetry={() => security.retrySessions()} />
	{:else}
		<ul data-testid="security-sessions">
			{#each security.sessionRows as row (row.sessionId)}
				{@const titleId = `security-session-title-${row.index}`}
				<li
					data-testid={`security-session-${row.index}`}
					data-current={row.current || undefined}
					data-pending={ending === row.index || undefined}
					data-dimmed={dimmed || undefined}
					class={cn(
						'flex flex-row items-start gap-3.5 border-b border-line py-4.5 transition-opacity duration-standard ease-standard',
						dimmed && 'pointer-events-none opacity-35'
					)}
				>
					<Ionicon name={row.icon} class="mt-0.5 icon-lg shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1">
						<h4
							id={titleId}
							data-testid={`security-session-${row.index}-name`}
							class="text-body-md font-semibold wrap-anywhere text-foreground"
						>
							{row.name}
						</h4>
						{#if row.current}
							<Badge
								tone="secondary"
								size="sm"
								label={m.auth_security_devices_current({}, options)}
								textClass="font-bold tracking-wide"
								class="mt-1 mb-0.5 rounded-sm"
								data-testid="security-session-current"
							/>
						{/if}
						{#if row.when}
							<p
								data-testid={`security-session-${row.index}-when`}
								class="text-body-sm text-muted-foreground"
							>
								{row.when}
							</p>
						{/if}
					</div>
					{#if !row.current}
						<TextButton
							label={m.auth_security_devices_end({}, options)}
							underline
							tone="foreground"
							textClass="text-body-sm underline-offset-3"
							aria-describedby={titleId}
							aria-disabled={dimmed || ending !== null || undefined}
							tabindex={dimmed ? -1 : undefined}
							data-testid={`security-session-${row.index}-end`}
							class="-my-3.5 shrink-0"
							onclick={() => void end(row)}
						/>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</Part>
