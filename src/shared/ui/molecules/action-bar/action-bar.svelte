<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/** `link` the underlined secondary (the default), `plain` one step up without the line (a peer of the primary). */
	export type ActionBarSecondaryAppearance = 'link' | 'plain';
	/** `compact` the filter footer's one-line 14 count (S-31.7); `default` every other bar. */
	export type ActionBarPrimaryAppearance = 'default' | 'compact';
	/** The three bars of the application (M-39): the criteria footer, the filter footer, the availability footer. */
	export type ActionBarPreset = 'default' | 'filters' | 'plain';

	const secondaryAppearanceClasses: Record<ActionBarSecondaryAppearance, string> = {
		link: 'text-body-sm font-semibold underline',
		plain: 'text-body-md font-semibold'
	};

	const primaryAppearanceClasses: Record<
		ActionBarPrimaryAppearance,
		{ label: string; pressable: string }
	> = {
		default: { label: 'text-body-lg', pressable: 'px-5' },
		compact: { label: 'text-body-sm', pressable: 'px-4' }
	};

	/** What a preset sets when the caller names nothing else (K2.8: the looks of today, nothing new). */
	export const actionBarPresets: Record<
		ActionBarPreset,
		{
			primaryAppearance: ActionBarPrimaryAppearance;
			secondaryAppearance: ActionBarSecondaryAppearance;
			separated: boolean;
		}
	> = {
		default: { primaryAppearance: 'default', secondaryAppearance: 'link', separated: false },
		filters: { primaryAppearance: 'compact', secondaryAppearance: 'link', separated: true },
		plain: { primaryAppearance: 'default', secondaryAppearance: 'plain', separated: false }
	};

	const focusRing = 'outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Spinner } from '$shared/ui/primitives/spinner';

	let {
		preset = 'default',
		primaryLabel,
		onPrimaryClick,
		primaryAriaLabel,
		primaryAppearance,
		primaryDisabled = false,
		primaryIcon,
		primaryLoading = false,
		primaryTestId,
		secondaryLabel,
		onSecondaryClick,
		secondaryAriaLabel,
		secondaryAppearance,
		secondaryDisabled = false,
		secondaryTestId,
		separated,
		contentWidthClass,
		class: className
	}: {
		preset?: ActionBarPreset;
		primaryLabel: string;
		onPrimaryClick: () => void;
		/** A fuller name than the visible label (the application's `primaryAccessibilityLabel`). */
		primaryAriaLabel?: string;
		primaryAppearance?: ActionBarPrimaryAppearance;
		/** Dimmed and refused, e.g. an apply with no result. */
		primaryDisabled?: boolean;
		/** A glyph before the label, in the label's colour. */
		primaryIcon?: IoniconName;
		/** A busy indicator instead of the glyph; presses refused. */
		primaryLoading?: boolean;
		primaryTestId?: string;
		secondaryLabel: string;
		onSecondaryClick: () => void;
		secondaryAriaLabel?: string;
		secondaryAppearance?: ActionBarSecondaryAppearance;
		/** Muted and refused, e.g. «clear all» with nothing to clear. */
		secondaryDisabled?: boolean;
		secondaryTestId?: string;
		/** An upward shadow (`shadow-bar`, no border) over the scrolling content. */
		separated?: boolean;
		/** The row's width (the application's `contentWidthClassName`), e.g. `tablet:max-w-form`. */
		contentWidthClass?: string;
		class?: string;
	} = $props();

	const primaryLook = $derived(
		primaryAppearanceClasses[primaryAppearance ?? actionBarPresets[preset].primaryAppearance]
	);
	const secondaryLook = $derived(
		secondaryAppearanceClasses[secondaryAppearance ?? actionBarPresets[preset].secondaryAppearance]
	);
	const isSeparated = $derived(separated ?? actionBarPresets[preset].separated);
	const isPrimaryBlocked = $derived(primaryDisabled || primaryLoading);
</script>

<!-- The application's `ActionBar`: a secondary action and the primary one on a row; when the two do not fit, the
     primary wraps, whole, to the row's end. The bottom pad is the bar's 16 plus the device safe area. -->
<div
	data-slot="action-bar"
	data-preset={preset}
	class={cn('px-5 pt-3 pb-safe-area-action', isSeparated && 'bg-background shadow-bar', className)}
>
	<div
		data-slot="action-bar-row"
		class={cn(
			'mx-auto flex w-full flex-row flex-wrap items-center justify-between gap-4',
			contentWidthClass
		)}
	>
		<button
			type="button"
			data-slot="action-bar-secondary"
			data-testid={secondaryTestId}
			aria-label={secondaryAriaLabel}
			disabled={secondaryDisabled}
			class={cn(
				'inline-flex min-h-touch min-w-touch items-center justify-center rounded-sm',
				focusRing,
				secondaryDisabled && 'opacity-40'
			)}
			onclick={() => onSecondaryClick()}
		>
			<span
				class={cn(secondaryLook, secondaryDisabled ? 'text-muted-foreground' : 'text-foreground')}
			>
				{secondaryLabel}
			</span>
		</button>

		<button
			type="button"
			data-slot="action-bar-primary"
			data-testid={primaryTestId}
			aria-label={primaryAriaLabel}
			aria-busy={primaryLoading || undefined}
			disabled={isPrimaryBlocked}
			class={cn(
				'ml-auto inline-flex min-h-control-md min-w-touch flex-row items-center justify-center gap-2.5 rounded-md border border-accent bg-accent shadow-soft',
				primaryLook.pressable,
				focusRing,
				isPrimaryBlocked && 'opacity-50'
			)}
			onclick={() => onPrimaryClick()}
		>
			{#if primaryLoading}
				<Spinner size="sm" tone="secondary-foreground" />
			{:else if primaryIcon}
				<Ionicon name={primaryIcon} class="icon-md text-secondary-foreground" />
			{/if}
			<span class={cn(primaryLook.label, 'shrink font-semibold text-secondary-foreground')}>
				{primaryLabel}
			</span>
		</button>
	</div>
</div>
