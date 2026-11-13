<script lang="ts">
	import type { IoniconName } from '$shared/ui/icons/ionicon';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		href,
		label,
		icon,
		dot = false,
		testId
	}: {
		href: string;
		/** Its name: a round link has no visible words. */
		label: string;
		icon: IoniconName;
		/** Something is new: the 10 dot on its rim (its name already says so). */
		dot?: boolean;
		testId: string;
	} = $props();
</script>

<!-- Record §5.1, §5.8 (`63-inbox/list.css:5` `.i-gear`; `56-profile` the bell): the round 44 on the `chip` fill inside
     its 48 target — the list's gear and the «Προφίλ»'s bell. A link, so it works before the scripts have run. No colour
     under the pointer (U-100); a press dims it. -->
<!-- The screen's address, already resolved (a module knows no route). -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	{href}
	aria-label={label}
	data-testid={testId}
	class="group relative inline-flex size-touch shrink-0 items-center justify-center rounded-full transition-opacity duration-standard ease-standard outline-none active:opacity-70"
>
	<span
		aria-hidden="true"
		class="grid size-inbox-glyph place-items-center rounded-full bg-chip text-foreground group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
	>
		<Ionicon name={icon} class="icon-lg" />
	</span>
	{#if dot}
		<span
			aria-hidden="true"
			data-testid={`${testId}-dot`}
			class="pointer-events-none absolute top-0.5 right-0.5 size-2.5 rounded-full bg-accent ring-2 ring-card"
		></span>
	{/if}
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
