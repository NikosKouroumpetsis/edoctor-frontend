<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/**
	 * One button: its glyph and name (the application's `accessibilityLabel`), and a press (`onclick`, its `onPress`)
	 * or a link (`href`, its `accessibilityRole="link"`); `external` opens the link in a new tab.
	 */
	export type IconButtonRowItem = {
		id: string;
		icon: IoniconName;
		ariaLabel: string;
		testId?: string;
	} & (
		| { onclick: () => void; href?: undefined; external?: undefined }
		| { href: string; external?: boolean; onclick?: undefined }
	);

	/** `start`: 48 circles from the start, 12 apart · `centered`: 40 circles in their 48 boxes, centred, 16 apart. */
	export type IconButtonRowVariant = 'start' | 'centered';

	const rowClasses: Record<IconButtonRowVariant, string> = {
		start: 'flex flex-row items-center gap-3',
		centered: 'flex flex-row items-center justify-center gap-4 self-center'
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		items,
		variant = 'start',
		testId,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		items: readonly IconButtonRowItem[];
		variant?: IconButtonRowVariant;
		testId?: string;
	} = $props();
</script>

<!-- The application's row (M-25): tint icon buttons on the `strong` surface with md glyphs; no items draw nothing. -->
{#if items.length > 0}
	<div
		data-slot="icon-button-row"
		data-variant={variant}
		data-testid={testId}
		class={cn(rowClasses[variant], className)}
		{...restProps}
	>
		{#each items as item (item.id)}
			<!-- `noreferrer` also means `noopener` (HTML): the new tab neither reaches back nor learns the page. -->
			{@const target = item.href && item.external ? '_blank' : undefined}
			{@const rel = item.href && item.external ? 'noreferrer' : undefined}
			{#if variant === 'centered'}
				<IconButton
					icon={item.icon}
					appearance="tint"
					surface="strong"
					iconSize="md"
					size="sm"
					aria-label={item.ariaLabel}
					href={item.href}
					{target}
					{rel}
					onclick={item.onclick}
					data-testid={item.testId}
				/>
			{:else}
				<IconButton
					icon={item.icon}
					appearance="tint"
					surface="strong"
					iconSize="md"
					size="touch"
					aria-label={item.ariaLabel}
					href={item.href}
					{target}
					{rel}
					onclick={item.onclick}
					data-testid={item.testId}
				/>
			{/if}
		{/each}
	</div>
{/if}
