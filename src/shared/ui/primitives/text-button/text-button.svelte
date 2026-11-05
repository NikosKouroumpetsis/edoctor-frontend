<script lang="ts" module>
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export type TextButtonTone = 'foreground' | 'primary' | 'muted' | 'danger';

	// A link drawn at its label's size inside the 48 touch box, so it is as easy to hit as a button. A disabled one keeps
	// its presses refused by the browser and shows the `not-allowed` cursor (U-28.4, `layout.css`).
	const textButtonBox =
		'inline-flex min-h-touch min-w-touch items-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

	// U-28.4: with a pointer, the words take their line on hover — a plain label its underline, an underlined one the
	// line twice as thick (never while disabled).
	const hoverClasses = {
		plain: 'can-hover:not-disabled:hover:[&>span]:underline',
		underlined: 'can-hover:not-disabled:hover:[&>span]:decoration-2'
	};

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
			/** «›» after the label, which steps aside under a pointer (the row of a «Διαβάστε περισσότερα»). */
			chevron?: boolean;
			ref?: HTMLElement | null;
		};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		label,
		tone,
		underline = false,
		textClass,
		chevron = false,
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

{#snippet arrow()}
	{#if chevron}
		<Ionicon
			name="chevron-forward"
			class="ml-0.5 icon-sm shrink-0 text-foreground transition-transform duration-standard ease-standard can-hover:not-disabled:group-hover:translate-x-0.5"
		/>
	{/if}
{/snippet}

{#if href}
	<a
		bind:this={ref}
		{href}
		data-slot="text-button"
		class={cn(
			textButtonBox,
			chevron && 'group',
			underline ? hoverClasses.underlined : hoverClasses.plain,
			className
		)}
		{...restProps}
	>
		<span class={labelClasses}>{label}</span>
		{@render arrow()}
	</a>
{:else}
	<button
		bind:this={ref}
		{type}
		data-slot="text-button"
		class={cn(
			textButtonBox,
			chevron && 'group',
			underline ? hoverClasses.underlined : hoverClasses.plain,
			className
		)}
		{...restProps}
	>
		<span class={labelClasses}>{label}</span>
		{@render arrow()}
	</button>
{/if}
