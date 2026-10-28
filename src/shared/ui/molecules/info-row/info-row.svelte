<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/**
	 * The application's four rows (study D4): `circled` a glyph in a 40 tint circle; `plain` (12 apart) and
	 * `plain-wide` (16) a bare glyph with the value in primary text; `inline` «title **value**» in one line.
	 */
	export type InfoRowVariant = 'circled' | 'plain' | 'plain-wide' | 'inline';
	export type InfoRowIconTone = 'foreground' | 'primary';

	/** Only the `inline` row acts: a press (`onclick`, the application's `onPress`) or a link (`href`, a `tel:`). */
	type InfoRowLook =
		| {
				variant: 'inline';
				onclick?: () => void;
				href?: undefined;
				/** The name of the acting row; «title value» when the caller names nothing. */
				'aria-label'?: string;
				valueTestId?: string;
		  }
		| {
				variant: 'inline';
				href: string;
				onclick?: undefined;
				'aria-label'?: string;
				valueTestId?: string;
		  }
		| {
				variant: Exclude<InfoRowVariant, 'inline'>;
				onclick?: never;
				href?: never;
				'aria-label'?: never;
				valueTestId?: never;
		  };

	export type InfoRowProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'onclick'> &
		InfoRowLook & {
			icon: IoniconName;
			/** The fact's name, already localized. */
			title: string;
			/** Its value, formatted by the caller («12 έτη», «Δωρεάν»). */
			value?: string;
			description?: string;
			iconTone?: InfoRowIconTone;
			testId?: string;
		};

	const iconTones: Record<InfoRowIconTone, string> = {
		foreground: 'text-foreground',
		primary: 'text-primary'
	};

	/** 🔴 U-02.2: the acting inline row's box (the application's `Pressable`); the focus ring is the web's own state. */
	const actionClasses =
		'flex min-h-touch w-full flex-row items-start gap-3 rounded-sm text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		variant,
		icon,
		title,
		value,
		description,
		iconTone = 'foreground',
		onclick,
		href,
		'aria-label': ariaLabel,
		valueTestId,
		testId,
		class: className,
		...restProps
	}: InfoRowProps = $props();

	const name = $derived(ariaLabel ?? `${title} ${value ?? ''}`.trim());
</script>

{#snippet glyph()}
	<Ionicon name={icon} class={cn('icon-md', iconTones[iconTone])} />
{/snippet}

{#snippet inline()}
	{@render glyph()}
	<span class="flex-1 text-body-md text-foreground"
		>{`${title} `}<span class="font-semibold" data-testid={valueTestId}>{value}</span></span
	>
{/snippet}

{#snippet column()}
	<div class="flex flex-1 flex-col gap-1">
		<!-- «title: value», the value in primary text except in the circled row (the application's nested text). -->
		<p class="text-body-md font-semibold text-foreground">
			{title}{value === undefined
				? ''
				: ': '}{#if value !== undefined && variant === 'circled'}{value}{:else if value !== undefined}<span
					class="text-primary-text">{value}</span
				>{/if}
		</p>
		{#if description !== undefined}
			<p class="text-body-sm text-muted-foreground">{description}</p>
		{/if}
	</div>
{/snippet}

{#if variant === 'inline' && href}
	<a
		{href}
		aria-label={name}
		data-slot="info-row"
		data-variant={variant}
		data-testid={testId}
		class={cn(actionClasses, className)}
		{...restProps}
	>
		{@render inline()}
	</a>
{:else if variant === 'inline' && onclick}
	<button
		type="button"
		aria-label={name}
		data-slot="info-row"
		data-variant={variant}
		data-testid={testId}
		{onclick}
		class={cn(actionClasses, className)}
		{...restProps}
	>
		{@render inline()}
	</button>
{:else if variant === 'inline'}
	<div
		data-slot="info-row"
		data-variant={variant}
		data-testid={testId}
		class={cn('flex flex-row items-start gap-3', className)}
		{...restProps}
	>
		{@render inline()}
	</div>
{:else if variant === 'circled'}
	<div
		data-slot="info-row"
		data-variant={variant}
		data-testid={testId}
		class={cn('flex flex-row items-start gap-4', className)}
		{...restProps}
	>
		<span
			data-slot="info-row-circle"
			class="flex size-control-sm shrink-0 items-center justify-center rounded-full bg-foreground/8"
		>
			{@render glyph()}
		</span>
		{@render column()}
	</div>
{:else}
	<div
		data-slot="info-row"
		data-variant={variant}
		data-testid={testId}
		class={cn('flex flex-row items-start', variant === 'plain-wide' ? 'gap-4' : 'gap-3', className)}
		{...restProps}
	>
		{@render glyph()}
		{@render column()}
	</div>
{/if}
