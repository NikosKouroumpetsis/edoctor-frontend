<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import type { SettingsPageId, SettingsSectionId } from '$modules/profile/types';

	let {
		locale,
		id,
		page = null,
		title,
		titleAs = 'h2',
		backHref,
		backAlways = false,
		own = false,
		children
	}: {
		locale: SupportedLocale;
		id: SettingsSectionId;
		/** The page of the section this draws (screen 62), `null` for the section itself. */
		page?: SettingsPageId | null;
		title: string;
		/** `h1` where the shell's own title is not on the page (a guest's «Απόρρητο», a page of its own). */
		titleAs?: 'h1' | 'h2';
		/** «←»: the shell's list below 950, or — for a page a section opened — the page before it. */
		backHref: string;
		/** «←» at every width: a page a section opened, or a page of its own (from 950 a section has none). */
		backAlways?: boolean;
		/**
		 * 🔴 D-W45-29: a page of its OWN, outside the shell's two columns (a guest's «Απόρρητο»): from 950 it keeps its own
		 * sides and top — the template's centred column insets nothing there.
		 */
		own?: boolean;
		children: Snippet;
	} = $props();

	const titleId = $derived(`settings-section-title-${page ?? id}`);
</script>

<!-- A section of the shell (record §5.2, `57-settings/set.css:3-5` `.s-page`, `.s-h`): below 950 a page of its own — «←»
     to the shell's list, then its title 24 / 600 — one column of 560; from 950 the right column's centred box (the
     template's, U-167), no «←». A page the section opened (screen 62, `62-privacy/priv.js` `sub()`) keeps its «←» at
     every width. The page's title is the shell's; a section's is a heading under it. A page of its own (`own`, a
     guest's «Απόρρητο») is the one column of 640 in the middle, with its own sides. -->
<section
	aria-labelledby={titleId}
	data-testid={`settings-section-${id}`}
	data-page={page ?? undefined}
	data-own={own || undefined}
	class={cn('px-gutter-sm pt-3 pb-pane-inset-lg tablet:pt-section', !own && 'split:p-0')}
>
	<div class="mx-auto w-full max-w-form split:max-w-none">
		<IconButton
			icon="arrow-back"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.profile_account_settings_back({}, { locale })}
			href={backHref}
			data-testid="settings-section-back"
			class={cn('mb-3', !backAlways && 'split:hidden')}
		/>
		<svelte:element
			this={titleAs}
			id={titleId}
			class="mt-1 mb-2 text-heading-md font-semibold text-foreground"
		>
			{title}
		</svelte:element>
		{@render children()}
	</div>
</section>
