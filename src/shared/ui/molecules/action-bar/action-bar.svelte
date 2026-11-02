<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/** `link` the underlined secondary (the default), `plain` one step up without the line (a peer of the primary). */
	export type ActionBarSecondaryAppearance = 'link' | 'plain';
	/** `compact` the filter footer's one-line 14 count (S-31.7); `default` every other bar. */
	export type ActionBarPrimaryAppearance = 'default' | 'compact';
	/** The three bars of the application (M-39): the criteria footer, the filter footer, the availability footer. */
	export type ActionBarPreset = 'default' | 'filters' | 'plain';
	/** The primary's corners: `default` the 12 of every bar, `pill` the full round of the search (U-23.1). */
	export type ActionBarPrimaryShape = 'default' | 'pill';

	const primaryShapeClasses: Record<ActionBarPrimaryShape, string> = {
		default: 'rounded-md',
		pill: 'rounded-full'
	};

	/** The primary's fill: `accent` the search's (the default), `contrast` the dark of the filters' count (U-24.3). */
	export type ActionBarPrimaryTone = 'accent' | 'contrast';

	const primaryToneClasses: Record<ActionBarPrimaryTone, string> = {
		accent: 'border-accent bg-accent',
		contrast: 'border-secondary bg-secondary'
	};
	const primaryHoverClasses: Record<ActionBarPrimaryTone, string> = {
		accent: 'can-hover:hover:bg-accent/90',
		contrast: 'can-hover:hover:bg-secondary/90'
	};

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
		primaryShape = 'default',
		primaryTone = 'accent',
		primaryTestId,
		secondaryLabel,
		onSecondaryClick,
		secondaryAriaLabel,
		secondaryAppearance,
		secondaryDisabled = false,
		secondaryTestId,
		separated,
		singleLine = false,
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
		primaryShape?: ActionBarPrimaryShape;
		primaryTone?: ActionBarPrimaryTone;
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
		/**
		 * The two never wrap (U-24.3, the filters' footer «at every width»): both labels on one line, 16 a side and
		 * 8 between on the phone (the prototype's narrow gaps), 24 and 16 from 744, the primary 24 in from 744.
		 */
		singleLine?: boolean;
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
	data-single-line={singleLine || undefined}
	class={cn(
		singleLine ? 'px-4 pt-3 tablet:px-6' : 'px-5 pt-3',
		'pb-safe-area-action',
		isSeparated && 'bg-background shadow-bar',
		className
	)}
>
	<div
		data-slot="action-bar-row"
		class={cn(
			'mx-auto flex w-full flex-row items-center justify-between',
			singleLine ? 'flex-nowrap gap-2 tablet:gap-4' : 'flex-wrap gap-4',
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
				// U-28.4: with a pointer, the light fill on hover (Airbnb's «Εκκαθάριση όλων»), never while disabled.
				secondaryDisabled
					? 'opacity-40'
					: 'transition-colors duration-standard ease-standard can-hover:hover:bg-foreground/5'
			)}
			onclick={() => onSecondaryClick()}
		>
			<span
				class={cn(
					secondaryLook,
					singleLine && 'whitespace-nowrap',
					secondaryDisabled ? 'text-muted-foreground' : 'text-foreground'
				)}
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
				'ml-auto inline-flex min-h-control-md min-w-touch flex-row items-center justify-center gap-2.5 border shadow-soft',
				primaryToneClasses[primaryTone],
				primaryShapeClasses[primaryShape],
				primaryLook.pressable,
				singleLine && 'shrink-0 tablet:px-6',
				focusRing,
				// U-28.4: with a pointer, the fill a shade lighter on hover (as the kit's `Button`), never while blocked.
				isPrimaryBlocked
					? 'opacity-50'
					: cn(
							'transition-colors duration-standard ease-standard',
							primaryHoverClasses[primaryTone]
						)
			)}
			onclick={() => onPrimaryClick()}
		>
			{#if primaryLoading}
				<Spinner size="sm" tone="secondary-foreground" />
			{:else if primaryIcon}
				<Ionicon name={primaryIcon} class="icon-md text-secondary-foreground" />
			{/if}
			<span
				class={cn(
					primaryLook.label,
					'shrink font-semibold text-secondary-foreground',
					singleLine && 'whitespace-nowrap'
				)}
			>
				{primaryLabel}
			</span>
		</button>
	</div>
</div>
