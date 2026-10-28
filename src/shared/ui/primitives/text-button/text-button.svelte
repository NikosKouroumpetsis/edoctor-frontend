<script lang="ts" module>
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export type TextButtonTone = 'foreground' | 'primary' | 'muted' | 'danger';

	// A link drawn at its label's size inside the 48 touch box, so it is as easy to hit as a button.
	const textButtonBox =
		'inline-flex min-h-touch min-w-touch items-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

	const toneClasses: Record<TextButtonTone, string> = {
		foreground: 'text-foreground',
		primary: 'text-primary-text',
		muted: 'text-muted-foreground',
		danger: 'text-danger-text'
	};

	const TEXT_ROLE = /\btext-(display|heading|title|body|label)-[a-z0-9-]+\b/;

	/**
	 * The ONE colour of the label (S-32.16): its `tone`'s; with none, its size's — the caption's
	 * `muted-foreground` at the default size, `foreground` at a size the caller names (S-32.19).
	 */
	export function textButtonLabelClasses({
		tone,
		underline = false,
		textClass
	}: { tone?: TextButtonTone; underline?: boolean; textClass?: string } = {}): string {
		const hasRole = TEXT_ROLE.test(textClass ?? '');
		return [
			'font-semibold',
			hasRole ? undefined : 'text-body-sm',
			tone ? toneClasses[tone] : toneClasses[hasRole ? 'foreground' : 'muted'],
			underline ? 'underline' : undefined
		]
			.filter(Boolean)
			.join(' ');
	}

	export type TextButtonProps = Omit<HTMLButtonAttributes, 'children'> &
		Omit<HTMLAnchorAttributes, 'children'> & {
			label: string;
			tone?: TextButtonTone;
			underline?: boolean;
			/** Classes of the label: a text role only, never a colour. */
			textClass?: string;
			ref?: HTMLElement | null;
		};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		label,
		tone,
		underline = false,
		textClass,
		href,
		type = 'button',
		class: className,
		ref = $bindable(null),
		...restProps
	}: TextButtonProps = $props();

	const labelClasses = $derived(
		cn(textButtonLabelClasses({ tone, underline, textClass }), textClass)
	);
</script>

{#if href}
	<a
		bind:this={ref}
		{href}
		data-slot="text-button"
		class={cn(textButtonBox, className)}
		{...restProps}
	>
		<span class={labelClasses}>{label}</span>
	</a>
{:else}
	<button
		bind:this={ref}
		{type}
		data-slot="text-button"
		class={cn(textButtonBox, className)}
		{...restProps}
	>
		<span class={labelClasses}>{label}</span>
	</button>
{/if}
