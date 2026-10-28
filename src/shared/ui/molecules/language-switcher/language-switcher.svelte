<script lang="ts" module>
	export type LanguageOption = {
		locale: string;
		/** The same page in that language, already localized and resolved by the caller. */
		href: string;
		/** The language's name in itself («Ελληνικά», «English»): the link's accessible name. */
		label: string;
		/** The two letters on the button («EL», «EN»). */
		shortLabel: string;
		current: boolean;
	};

	// One segment per language: 48 targets side by side, the current one filled (no gap: one control).
	const segmentClass =
		'inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm px-2 text-label-md font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		options,
		'aria-label': ariaLabel
	}: {
		options: LanguageOption[];
		/** The group's name, already localized. */
		'aria-label'?: string;
	} = $props();
</script>

<div
	role="group"
	aria-label={ariaLabel}
	data-slot="language-switcher"
	class="flex items-center rounded-md border border-border bg-background"
>
	{#each options as option (option.locale)}
		<a
			href={option.href}
			hreflang={option.locale}
			lang={option.locale}
			aria-label={option.label}
			aria-current={option.current ? 'true' : undefined}
			class={cn(
				segmentClass,
				option.current ? 'bg-secondary text-secondary-foreground' : 'text-foreground hover:bg-muted'
			)}
		>
			{option.shortLabel}
		</a>
	{/each}
</div>
