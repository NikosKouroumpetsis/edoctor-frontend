<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	export type InlineLinkTextTone = 'muted' | 'foreground';

	const toneClasses: Record<InlineLinkTextTone, string> = {
		muted: 'text-muted-foreground',
		foreground: 'text-foreground'
	};

	export type InlineLinkTextProps = Omit<HTMLAttributes<HTMLParagraphElement>, 'children'> & {
		/** The sentence; the link follows it on the same line and wraps with it. */
		text: string;
		linkLabel: string;
		/** A link to a page (`<a>`), or … */
		href?: string;
		/** … an action in place (`<button>`), the application's `onLinkPress`. */
		onLinkPress?: () => void;
		tone?: InlineLinkTextTone;
		linkTestId?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		text,
		linkLabel,
		href,
		onLinkPress,
		tone = 'muted',
		linkTestId,
		class: className,
		...restProps
	}: InlineLinkTextProps = $props();

	// The link is part of the sentence: the WCAG 2.5.8 «inline» exception to the 48 target (touch-targets test).
	const linkClass =
		'text-body-sm font-semibold text-foreground underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<p
	data-slot="inline-link-text"
	class={cn('text-body-sm', toneClasses[tone], className)}
	{...restProps}
>
	{text}&#32;{#if href}<a
			{href}
			data-slot="inline-link-text-link"
			data-testid={linkTestId}
			class={linkClass}>{linkLabel}</a
		>{:else}<button
			type="button"
			data-slot="inline-link-text-link"
			data-testid={linkTestId}
			class={cn(linkClass, 'inline cursor-pointer')}
			onclick={() => onLinkPress?.()}>{linkLabel}</button
		>{/if}
</p>
