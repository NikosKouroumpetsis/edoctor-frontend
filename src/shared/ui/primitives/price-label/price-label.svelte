<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** An `amount`, a `note` that stands for one («on request»), or an `action` the reader presses for it (S-31.4). */
	export type PriceLabelKind = 'amount' | 'action' | 'note';
	/** Where it sits — a rail card, a list card, a bottom bar, an offer — which fixes its size, colour, side and lines. */
	export type PriceLabelPlacement = 'card' | 'card-list' | 'bar' | 'offer';

	type PriceLook = { text: string; lines?: 1 | 2 };

	/** 🔴 U-02.2: the twelve looks the application draws (study M-06), each placement's three kinds as its screen wrote them. */
	export const priceLabelLooks: Record<PriceLabelPlacement, Record<PriceLabelKind, PriceLook>> = {
		card: {
			amount: { text: 'text-body-sm text-muted-foreground' },
			action: { text: 'text-label-md font-semibold text-foreground underline' },
			note: { text: 'text-body-sm text-muted-foreground' }
		},
		'card-list': {
			amount: { text: 'text-body-lg text-foreground' },
			action: { text: 'text-label-md font-semibold text-foreground underline' },
			note: { text: 'text-body-lg text-muted-foreground' }
		},
		bar: {
			amount: { text: 'text-title-sm font-semibold text-foreground', lines: 1 },
			action: { text: 'text-body-md font-semibold text-foreground underline', lines: 2 },
			note: { text: 'text-body-md font-semibold text-foreground', lines: 2 }
		},
		offer: {
			amount: { text: 'text-right text-title-sm font-semibold text-foreground', lines: 2 },
			action: { text: 'text-right text-body-sm font-semibold text-foreground underline', lines: 2 },
			note: { text: 'text-right text-body-sm font-semibold text-foreground', lines: 2 }
		}
	};

	const lineClamps: Record<1 | 2, string> = { 1: 'line-clamp-1', 2: 'line-clamp-2' };

	type PriceLabelAction =
		| { kind: 'action'; onAction: () => void; href?: undefined }
		| { kind: 'action'; href: string; onAction?: undefined }
		| { kind: 'amount' | 'note'; onAction?: undefined; href?: undefined };

	export type PriceLabelProps = Omit<HTMLAttributes<HTMLElement>, 'children'> &
		PriceLabelAction & {
			/** The words, formatted by the caller («Από 40 €» · «From €40», S-31.2). The action is named by them. */
			label: string;
			placement: PriceLabelPlacement;
		};

	/** The classes of one look (the label's text, then its line cap). */
	export function priceLabelClasses(placement: PriceLabelPlacement, kind: PriceLabelKind): string {
		const look = priceLabelLooks[placement][kind];
		return [look.text, look.lines ? lineClamps[look.lines] : ''].filter(Boolean).join(' ');
	}
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { TextButton } from '$shared/ui/primitives/text-button';

	let {
		kind,
		label,
		placement,
		onAction,
		href,
		class: className,
		...restProps
	}: PriceLabelProps = $props();

	const text = $derived(priceLabelClasses(placement, kind));
</script>

{#if kind === 'action'}
	<!-- The action is the kit's text link: its own 48 box (the application's Pressable), the look's words inside. -->
	<TextButton
		{label}
		{href}
		tone="foreground"
		textClass={text}
		data-slot="price-label"
		data-kind={kind}
		data-placement={placement}
		class={cn(placement === 'offer' && 'justify-end', className)}
		onclick={href ? undefined : () => onAction?.()}
		{...restProps}
	/>
{:else}
	<p
		data-slot="price-label"
		data-kind={kind}
		data-placement={placement}
		class={cn(text, className)}
		{...restProps}
	>
		{label}
	</p>
{/if}
