<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { tv, type VariantProps, type WithElementRef } from '$shared/lib/utils';
	import type { SpinnerTone } from '$shared/ui/primitives/spinner';

	/**
	 * The application's `Button` (`atoms/button`), class for class: tone × bordered, the control heights and the
	 * radius steps. The label's look is `buttonLabelVariants`; triggers of overlays reuse this recipe on their own
	 * element. The keyboard focus ring is the web's own state (the application has no focus to draw). U-28.4 (the
	 * web's own state too, Airbnb's): with a pointer each tone changes its fill on hover (a solid one a shade lighter, a
	 * light one a step stronger), never while disabled; a disabled button keeps its presses refused by the browser and
	 * shows the `not-allowed` cursor (`layout.css`), a blocked link takes no pointer at all.
	 */
	export const buttonVariants = tv({
		base: 'inline-flex min-w-touch shrink-0 items-center justify-center transition-colors duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
		variants: {
			tone: {
				primary: 'bg-primary',
				secondary: 'bg-secondary/5',
				accent: 'bg-accent',
				contrast: 'bg-secondary',
				ghost: 'bg-card/40',
				muted: 'bg-foreground/5',
				outline: 'bg-transparent'
			},
			// U-28.4 (`true`, the default): the fill changes on hover; `false` (U-100: a caller with no hover) never.
			hover: {
				true: '',
				false: ''
			},
			size: {
				default: 'min-h-control-md min-w-touch px-5 py-3',
				lg: 'min-h-control-lg min-w-touch px-6 py-4'
			},
			radius: {
				sm: 'rounded-sm',
				md: 'rounded-md',
				lg: 'rounded-lg',
				full: 'rounded-full'
			},
			bordered: {
				true: 'border',
				false: 'border-0'
			}
		},
		compoundVariants: [
			{ hover: true, tone: 'primary', class: 'can-hover:not-disabled:hover:bg-primary/90' },
			{ hover: true, tone: 'secondary', class: 'can-hover:not-disabled:hover:bg-secondary/10' },
			{ hover: true, tone: 'accent', class: 'can-hover:not-disabled:hover:bg-accent/90' },
			{ hover: true, tone: 'contrast', class: 'can-hover:not-disabled:hover:bg-secondary/90' },
			{ hover: true, tone: 'ghost', class: 'can-hover:not-disabled:hover:bg-foreground/5' },
			{ hover: true, tone: 'muted', class: 'can-hover:not-disabled:hover:bg-foreground/10' },
			{ hover: true, tone: 'outline', class: 'can-hover:not-disabled:hover:bg-foreground/5' },
			{ bordered: true, tone: 'primary', class: 'border-primary' },
			{ bordered: true, tone: 'secondary', class: 'border-secondary/10' },
			{ bordered: true, tone: 'accent', class: 'border-accent' },
			{ bordered: true, tone: 'contrast', class: 'border-secondary' },
			{ bordered: true, tone: 'ghost', class: 'border-border/60' },
			{ bordered: true, tone: 'muted', class: 'border-secondary/10' },
			{ bordered: true, tone: 'outline', class: 'border-foreground' }
		],
		defaultVariants: {
			tone: 'primary',
			size: 'default',
			radius: 'md',
			bordered: true,
			hover: true
		}
	});

	export type ButtonTone = NonNullable<VariantProps<typeof buttonVariants>['tone']>;
	export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;
	export type ButtonRadius = NonNullable<VariantProps<typeof buttonVariants>['radius']>;
	export type ButtonLabelCase = 'normal' | 'uppercase';

	// The ONE colour of a label (S-32.16): a solid fill's own, the outline's `foreground`; the other tones wear their size's.
	const toneLabelClasses: Partial<Record<ButtonTone, string>> = {
		primary: 'text-primary-foreground',
		accent: 'text-secondary-foreground',
		contrast: 'text-secondary-foreground',
		outline: 'text-foreground'
	};

	const labelCaseClasses: Record<ButtonLabelCase, string> = {
		uppercase: 'uppercase tracking-control',
		normal: 'normal-case tracking-normal'
	};

	/** The busy indicator reads on the surface it sits on, so it follows the tone's LABEL colour. */
	export const buttonSpinnerTones: Record<ButtonTone, SpinnerTone> = {
		primary: 'primary-foreground',
		secondary: 'foreground',
		accent: 'secondary-foreground',
		contrast: 'secondary-foreground',
		ghost: 'foreground',
		muted: 'foreground',
		outline: 'foreground'
	};

	const TEXT_ROLE = /\btext-(display|heading|title|body|label)-[a-z0-9-]+\b/;

	/**
	 * The label's classes: semibold, the case, `body-sm` unless the caller names a role, and the tone's colour —
	 * the caption's `muted-foreground` at the default size, `foreground` at a size the caller names (S-32.19).
	 */
	export function buttonLabelVariants({
		tone = 'primary',
		labelCase = 'normal',
		textClass
	}: { tone?: ButtonTone; labelCase?: ButtonLabelCase; textClass?: string } = {}): string {
		const hasRole = TEXT_ROLE.test(textClass ?? '');
		return [
			'text-center font-semibold',
			labelCaseClasses[labelCase],
			hasRole ? undefined : 'text-body-sm',
			toneLabelClasses[tone] ?? (hasRole ? 'text-foreground' : 'text-muted-foreground')
		]
			.filter(Boolean)
			.join(' ');
	}

	/**
	 * The whole look of a button — box and label — for an element that must stay another component (an overlay's
	 * trigger or close): `<DialogTrigger class={buttonClasses({ tone: 'outline' })}>`.
	 */
	export function buttonClasses({
		tone = 'primary',
		size = 'default',
		radius = 'md',
		bordered = true,
		labelCase = 'normal'
	}: {
		tone?: ButtonTone;
		size?: ButtonSize;
		radius?: ButtonRadius;
		bordered?: boolean;
		labelCase?: ButtonLabelCase;
	} = {}): string {
		return `${buttonVariants({ tone, size, radius, bordered })} ${buttonLabelVariants({ tone, labelCase })}`;
	}

	type SharedProps = {
		/** The visible words; uppercased the Greek way when `labelCase` is `uppercase`. */
		label: string;
		tone?: ButtonTone;
		size?: ButtonSize;
		radius?: ButtonRadius;
		labelCase?: ButtonLabelCase;
		bordered?: boolean;
		/** A glyph before the label (never inside a loading button). */
		leading?: Snippet;
		/** Swaps the label for a busy indicator, refuses presses and keeps the box and the name. */
		loading?: boolean;
		/** Classes of the label: a text role only, never a colour (S-32.18). */
		textClass?: string;
		/** U-28.4 (`true`): the fill changes on hover; `false` (D-W3-27): it never does. */
		hover?: boolean;
	};

	export type ButtonProps = SharedProps &
		WithElementRef<Omit<HTMLButtonAttributes, 'children'>> &
		WithElementRef<Omit<HTMLAnchorAttributes, 'children'>>;
</script>

<script lang="ts">
	import { toGreekUpperCase } from '$shared/lib/text';
	import { cn } from '$shared/lib/utils';
	import { Spinner } from '$shared/ui/primitives/spinner';

	let {
		label,
		tone = 'primary',
		size = 'default',
		radius = 'md',
		labelCase = 'normal',
		bordered = true,
		leading,
		loading = false,
		textClass,
		hover = true,
		class: className,
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled = false,
		'aria-label': ariaLabel,
		...restProps
	}: ButtonProps = $props();

	const isBlocked = $derived(Boolean(disabled) || loading);
	const shown = $derived(labelCase === 'uppercase' ? toGreekUpperCase(label) : label);
	// 🔴 The accent stays for the ear: a label rewritten for the eye keeps its spelling as the accessible name.
	const name = $derived(ariaLabel ?? (shown !== label || loading ? label : undefined));
	const labelClasses = $derived(cn(buttonLabelVariants({ tone, labelCase, textClass }), textClass));
</script>

{#snippet content()}
	{#if loading}
		<Spinner size="sm" tone={buttonSpinnerTones[tone]} />
	{:else if leading}
		<span class="flex flex-row items-center gap-3">
			<span class="pointer-events-none inline-flex" aria-hidden="true">{@render leading()}</span>
			<span class={labelClasses}>{shown}</span>
		</span>
	{:else}
		<span class={labelClasses}>{shown}</span>
	{/if}
{/snippet}

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		data-tone={tone}
		class={cn(buttonVariants({ tone, size, radius, bordered, hover }), className)}
		href={isBlocked ? undefined : href}
		aria-label={name}
		aria-disabled={isBlocked || undefined}
		aria-busy={loading || undefined}
		role={isBlocked ? 'link' : undefined}
		tabindex={isBlocked ? -1 : undefined}
		{...restProps}
	>
		{@render content()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		data-tone={tone}
		class={cn(buttonVariants({ tone, size, radius, bordered, hover }), className)}
		{type}
		disabled={isBlocked}
		aria-label={name}
		aria-busy={loading || undefined}
		{...restProps}
	>
		{@render content()}
	</button>
{/if}
