<script lang="ts" module>
	import { tv, type VariantProps } from '$shared/lib/utils';

	/**
	 * The application's `atoms/toggle` (R4-16): the `label-md` words in the muted colour, pressed on the accent fill
	 * with the secondary foreground, the `sm` corner; sizes `sm | md | lg` (U-07.1), each box the touch target.
	 */
	export const toggleVariants = tv({
		base: "inline-flex min-w-touch items-center justify-center gap-2 rounded-sm text-label-md font-medium whitespace-nowrap text-muted-foreground transition-[color,box-shadow] outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-secondary-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		variants: {
			variant: {
				default: 'bg-transparent',
				outline: 'border border-input bg-transparent shadow-raised hover:bg-muted'
			},
			size: {
				sm: 'min-h-touch min-w-touch px-1.5',
				md: 'min-h-touch min-w-touch px-2',
				lg: 'min-h-control-lg min-w-control-lg px-2.5'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'md'
		}
	});

	export type ToggleVariant = VariantProps<typeof toggleVariants>['variant'];
	export type ToggleSize = VariantProps<typeof toggleVariants>['size'];
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';

	let {
		ref = $bindable(null),
		pressed = $bindable(false),
		variant = 'default',
		size = 'md',
		class: className,
		disabled,
		onPressedChange,
		children,
		...restProps
	}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
		pressed?: boolean;
		variant?: ToggleVariant;
		size?: ToggleSize;
		onPressedChange?: (pressed: boolean) => void;
	} = $props();

	function toggle() {
		if (disabled) return;
		pressed = !pressed;
		onPressedChange?.(pressed);
	}
</script>

<button
	bind:this={ref}
	type="button"
	aria-pressed={pressed}
	data-slot="toggle"
	data-state={pressed ? 'on' : 'off'}
	{disabled}
	onclick={toggle}
	class={cn(toggleVariants({ variant, size }), className)}
	{...restProps}
>
	{@render children?.()}
</button>
