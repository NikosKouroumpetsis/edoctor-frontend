<script lang="ts" module>
	export type TextVariant = 'title' | 'heading' | 'body' | 'caption' | 'eyebrow';

	/** The application's `Text` roles, class for class (`atoms/text`). */
	export const textVariants: Record<TextVariant, string> = {
		title: 'text-display-lg font-semibold tracking-tight text-foreground',
		heading: 'text-heading-xl font-semibold tracking-tight text-foreground',
		body: 'text-body-lg leading-relaxed text-foreground/80',
		caption: 'text-body-sm text-muted-foreground',
		eyebrow: 'text-label-md font-semibold uppercase tracking-eyebrow text-primary-text'
	};

	const TEXT_ROLE = /\btext-(display|heading|title|body|label)-[a-z0-9-]+\b/;

	/** Whether a class string names its own text role (then no variant applies unless one is given). */
	export function hasTextRole(className: string | null | undefined): boolean {
		return TEXT_ROLE.test(className ?? '');
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { toGreekUpperCase } from '$shared/lib/text';
	import { cn } from '$shared/lib/utils';

	let {
		variant,
		as = 'p',
		text,
		class: className,
		children,
		...restProps
	}: Omit<HTMLAttributes<HTMLElement>, 'class'> & {
		class?: string;
		/** A role of the application; without one (and without a `text-*` role in `class`) it is `body`. */
		variant?: TextVariant;
		/** The tag: the role is the look, the tag is the meaning (`h1`, `p`, `span`, `label` …). */
		as?: string;
		/** The words as a string: an uppercased role (`eyebrow`, `uppercase`) writes them the Greek way. */
		text?: string;
		children?: Snippet;
	} = $props();

	const resolvedVariant = $derived(variant ?? (hasTextRole(className) ? undefined : 'body'));
	const isUppercased = $derived(
		resolvedVariant === 'eyebrow' || /(^|\s)uppercase(\s|$)/.test(className ?? '')
	);
	const shown = $derived(text !== undefined && isUppercased ? toGreekUpperCase(text) : text);
	// 🔴 The tonos is kept for the ear: Greek speech places the stress from it, so a rewritten word keeps its spelling for AT.
	const rewritten = $derived(text !== undefined && shown !== text);
</script>

<!-- `wrap-break-word` (= `break-words`, overflow-wrap: break-word): a word wider than its line breaks, as React Native
     breaks it; words that fit never do (U-06.2: «προτεραιότητα» in `display-xl` ran 2 past the 343 canvas). -->
<svelte:element
	this={as}
	data-slot="text"
	class={cn(
		'wrap-break-word',
		resolvedVariant ? textVariants[resolvedVariant] : undefined,
		className
	)}
	{...restProps}
>
	{#if text !== undefined}
		{#if rewritten}
			<span aria-hidden="true">{shown}</span><span class="sr-only">{text}</span>
		{:else}
			{text}
		{/if}
	{:else}
		{@render children?.()}
	{/if}
</svelte:element>
