<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { getSessionOptional } from '$shared/state/session';
	import { Button } from '$shared/ui/primitives/button';
	import { buildProfileMenu } from '$modules/profile/lib/menu';
	import MenuRow from '../components/menu-row.svelte';
	import type { ProfileTabProps } from '../types';

	let { locale, hrefOf, onRow }: ProfileTabProps = $props();

	const options = $derived({ locale });
	const session = getSessionOptional();
	const isMember = $derived(session?.isMember ?? false);
	const sections = $derived(buildProfileMenu(options));
	let signingOut = $state(false);

	async function signOut() {
		signingOut = true;
		try {
			await session?.signOut();
		} finally {
			signingOut = false;
		}
	}
</script>

<svelte:head>
	<title>{m.profile_page_title({}, options)} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- 🔴 U-81.1 / U-82.1: the application's «Προφίλ» tab as it is today, a guest's and a member's, no new design (U-79.3):
     `ScreenShell` + `GuestTabTemplate` — the title 24/600 · the words 17 muted · the whole-width contrast button, then the
     rows in sections under a `border/70` line. From 744, for a direct link, the template's tablet values. -->
<main
	data-testid="profile-page"
	class="min-h-page bg-background px-gutter-sm pt-3 pb-bar-bottom tablet:pt-5 tablet:pb-section"
>
	<div
		class="mx-auto flex w-full max-w-narrow flex-col gap-section pt-3 tablet:max-w-form tablet:pt-6"
	>
		<div class="flex flex-col gap-3">
			<h1 class="text-heading-md font-semibold text-foreground tablet:text-display-md">
				{m.profile_page_title({}, options)}
			</h1>
			<p
				data-testid="profile-description"
				class="text-title-xs leading-relaxed text-muted-foreground tablet:max-w-text tablet:text-title-md"
			>
				{isMember
					? m.profile_signed_in_description({}, options)
					: m.profile_guest_description({}, options)}
			</p>
		</div>
		<Button
			tone="contrast"
			bordered={false}
			label={isMember ? m.profile_sign_out({}, options) : m.profile_guest_cta({}, options)}
			disabled={signingOut}
			data-testid="profile-cta"
			class="w-full px-cta-inline py-3.5 tablet:py-4"
			textClass="text-title-xs tablet:text-title-sm"
			onclick={() => (isMember ? signOut() : session?.requireSignIn())}
		/>
		<div class="flex flex-col gap-section">
			{#each sections as section (section.id)}
				<div
					data-testid={`profile-section-${section.id}`}
					class="flex flex-col gap-1 border-t border-border/70 pt-3"
				>
					{#each section.rows as row (row.id)}
						<MenuRow
							icon={row.icon}
							label={row.label}
							href={hrefOf(row.id)}
							onclick={() => onRow(row.id)}
							testId={`profile-menu-${row.id}`}
						/>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</main>
