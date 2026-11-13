<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import type { SettingsSection, SettingsSectionId } from '$modules/profile/types';
	import type { SettingsLinks } from '../types';

	let {
		locale,
		sections,
		selectedId,
		waiting,
		links
	}: {
		locale: SupportedLocale;
		/** The sections this reader has (D-W45-02, D-W45-05), in their order. */
		sections: SettingsSection[];
		/** From 950 the section open beside the menu. */
		selectedId: SettingsSectionId | null;
		/** The session is not known yet: the rows wait, the title does not. */
		waiting: boolean;
		links: SettingsLinks;
	} = $props();

	const options = $derived({ locale });
	const title = $derived(m.profile_menu_account_settings({}, options));
	const WAIT_ROWS = [0, 1, 2];
</script>

<!-- Screen 57's menu (record §5.2, `57-settings/set.js:57-58`, `set.css:15-17`, `56-profile/prof.css:34-36`). Below 950
     the page's list: «←» to the «Προφίλ», the title 28 / 600, rows of 56 with their glyph (24), their name 16 and «›».
     From 950 the left column: the title 24 / 600 and rows of 48 with the 12 corner, the name 15 and no «›» — the open one
     on the grey pill, bold, `aria-current="page"`. Every row is a link to its section's own address, so «back», a reload
     and a copied link agree. No colour under the pointer (U-100). -->
<div
	data-testid="settings-menu"
	class="px-gutter-sm pt-3 pb-pane-inset-lg tablet:pt-section split:p-0"
>
	<div class="mx-auto w-full max-w-form split:max-w-none">
		<IconButton
			icon="arrow-back"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.profile_account_settings_back({}, options)}
			href={links.profile}
			data-testid="settings-back"
			class="mb-3 split:hidden"
		/>
		<h1
			class="mt-1 mb-3 text-heading-lg font-semibold text-foreground split:mt-0 split:mb-4 split:ml-3.5 split:text-heading-md"
		>
			{title}
		</h1>
		{#if waiting}
			<div
				data-testid="settings-menu-loading"
				aria-busy="true"
				aria-label={title}
				class="mt-5 grid gap-3 split:mt-0"
			>
				{#each WAIT_ROWS as row (row)}
					<div aria-hidden="true">
						<Skeleton class="h-control-md w-full rounded-md" />
					</div>
				{/each}
			</div>
		{:else}
			<nav aria-label={title}>
				<ul class="mt-5 flex flex-col split:mt-0">
					{#each sections as section (section.id)}
						{@const selected = selectedId === section.id}
						<li>
							<!-- The screen's address, already resolved (a module knows no route). -->
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={links.section(section.id)}
								aria-current={selected ? 'page' : undefined}
								data-testid={`settings-section-link-${section.id}`}
								data-selected={selected || undefined}
								class={cn(
									'flex min-h-row w-full flex-row items-center gap-3.5 text-body-lg text-foreground transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70 split:min-h-touch split:rounded-md split:px-3.5 split:text-body-md',
									selected && 'split:bg-chip split:font-semibold'
								)}
							>
								<span class="grid size-6 shrink-0 place-items-center">
									<Ionicon name={section.icon} class="icon-lg" />
								</span>
								<span class="flex-1">{section.label}</span>
								<Ionicon
									name="chevron-forward"
									class="icon-md shrink-0 text-muted-foreground split:hidden"
								/>
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						</li>
					{/each}
				</ul>
			</nav>
		{/if}
	</div>
</div>
