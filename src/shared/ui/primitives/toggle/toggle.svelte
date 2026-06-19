<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const toggleVariants = tv({
		base: "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		variants: {
			variant: {
				default: 'bg-transparent',
				outline: 'border border-input bg-transparent shadow-xs hover:bg-muted hover:text-foreground'
			},
			size: {
				default: 'h-9 min-w-9 px-2',
				sm: 'h-8 min-w-8 px-1.5',
				lg: 'h-10 min-w-10 px-2.5'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
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
		size = 'default',
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
