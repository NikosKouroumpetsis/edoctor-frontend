<script lang="ts" module>
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	export type ChipSize = 'sm' | 'md';
	export type ChipVariant = 'filled' | 'tinted';

	// The button is the 48 touch box; the drawn pill (32 or 40) sits inside it and grows with its label.
	const chipBox =
		'inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center self-start rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

	const pillSizes: Record<ChipSize, string> = {
		sm: 'min-h-control-xs px-3',
		md: 'min-h-control-sm px-4'
	};
	const labelSizes: Record<ChipSize, string> = {
		sm: 'text-label-md',
		md: 'text-label-lg'
	};

	export type ChipProps = Omit<HTMLButtonAttributes, 'children'> & {
		label: string;
		/** A leading Ionicons glyph, as the other shared components take icons. */
		icon?: IoniconName;
		/** A count after the label (a filter's number of results). */
		count?: string | null;
		selected?: boolean;
		/** A trailing ✕ that marks the chip active; pressing the chip then calls `onRemove`. */
		removable?: boolean;
		onRemove?: () => void;
		/** `filled` solid primary when active, `tinted` the filter's primary tint. */
		variant?: ChipVariant;
		size?: ChipSize;
		/** Classes of the label: a text role only, never a colour. */
		textClass?: string;
		ref?: HTMLButtonElement | null;
	};
</script>

<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { getChipGroupContext } from './context';

	let {
		label,
		icon,
		count,
		selected = false,
		removable = false,
		onRemove,
		variant = 'filled',
		size = 'md',
		textClass,
		disabled = false,
		type = 'button',
		class: className,
		onclick,
		ref = $bindable(null),
		...restProps
	}: ChipProps = $props();

	const group = getChipGroupContext();
	const chipId = useId(undefined, 'chip');
	const isRadio = $derived(group?.type === 'single' && !removable);
	// One choice: only the Tab stop of the group is in the Tab order; the arrows reach the others.
	const tabIndex = $derived(isRadio ? (group?.tabStop === chipId ? 0 : -1) : undefined);

	// 🔴 Registered while the chip is created, not on mount: the server render (and so the page before hydration)
	// already has one Tab stop — the first radio, or the chosen one when it comes first — corrected on hydration.
	const unregister = untrack(() =>
		group?.register(chipId, () => ({ selected, eligible: isRadio && !disabled }))
	);
	onDestroy(() => unregister?.());
	const tinted = $derived(variant === 'tinted');
	const active = $derived(selected || removable);
	const activeText = $derived(tinted ? 'text-primary-text' : 'text-primary-foreground');

	function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		if (removable && onRemove) onRemove();
		else onclick?.(event);
	}
</script>

<button
	bind:this={ref}
	{type}
	{disabled}
	role={isRadio ? 'radio' : undefined}
	aria-checked={isRadio ? selected : undefined}
	aria-pressed={!isRadio && !removable ? selected : undefined}
	data-slot="chip"
	data-state={active ? 'on' : 'off'}
	data-roving-item={isRadio ? '' : undefined}
	tabindex={tabIndex}
	class={cn(chipBox, className)}
	onclick={handleClick}
	{...restProps}
>
	<span
		data-slot="chip-pill"
		class={cn(
			'inline-flex flex-row items-center justify-center gap-1.5 rounded-full border',
			active
				? tinted
					? 'border-primary bg-primary/10'
					: 'border-primary bg-primary'
				: 'border-border bg-card',
			pillSizes[size]
		)}
	>
		{#if icon}
			<Ionicon name={icon} class={cn('icon-sm', active ? 'text-primary' : 'text-foreground')} />
		{/if}
		<span
			class={cn(
				'truncate font-medium',
				labelSizes[size],
				active ? activeText : 'text-foreground',
				textClass
			)}
		>
			{label}
		</span>
		{#if count}
			<span class={cn('text-label-md', active ? activeText : 'text-muted-foreground')}>{count}</span
			>
		{/if}
		{#if removable}
			<span class="ml-0.5 inline-flex">
				<Ionicon name="close" class="icon-sm text-primary" />
			</span>
		{/if}
	</span>
</button>
