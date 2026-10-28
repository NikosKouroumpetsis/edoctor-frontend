<script lang="ts" module>
	import type { HTMLLabelAttributes } from 'svelte/elements';
	import type { field } from '$shared/design/tokens';

	/** The field sizes of the floating-label text-field family: the scale's `field` geometry (the application's). */
	export type FieldSize = keyof typeof field;

	type LabelGeometry = {
		/** Resting place and text role of the label. */
		rest: string;
		/** The float: the label shrinks to 75 % into the input's top padding. */
		float: string;
		/** The label's left edge, the size's side padding. */
		left: string;
		/** The same float when the browser autofilled the input before any script saw its value. */
		autofill: string;
	};

	/** The class form of the `field` tokens (16 / 20 / 24 top padding, 10 / 10 / 12 left). */
	const labelGeometry: Record<FieldSize, LabelGeometry> = {
		default: {
			rest: 'top-3 text-body-lg',
			float: '-translate-y-3',
			left: 'left-2.5',
			autofill: 'peer-autofill:-translate-y-3 peer-autofill:scale-75 peer-autofill:left-2.5'
		},
		lg: {
			rest: 'top-4 text-body-lg',
			float: '-translate-y-4',
			left: 'left-2.5',
			autofill: 'peer-autofill:-translate-y-4 peer-autofill:scale-75 peer-autofill:left-2.5'
		},
		xl: {
			rest: 'top-5 text-title-sm font-normal',
			float: '-translate-y-5',
			left: 'left-3',
			autofill: 'peer-autofill:-translate-y-5 peer-autofill:scale-75 peer-autofill:left-3'
		}
	};

	export type FloatingLabelProps = Omit<HTMLLabelAttributes, 'children'> & {
		label: string;
		/** True when the label floats up: the control is focused OR has a value. */
		floated: boolean;
		/** True while the control is focused: the active (foreground) colour. */
		focused?: boolean;
		/** The danger colour. */
		error?: boolean;
		/** The positioning parent sits inside the box's 1px border, so both places shed it. */
		insideBorder?: boolean;
		/** A leading icon reserves the left: the resting label clears it, the floated one returns to the padding. */
		leading?: boolean;
		size?: FieldSize;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		label,
		floated,
		focused = false,
		error = false,
		insideBorder = false,
		leading = false,
		size = 'default',
		class: className,
		'data-slot': dataSlot = 'floating-label',
		...restProps
	}: FloatingLabelProps = $props();

	const geometry = $derived(labelGeometry[size]);
</script>

<!--
	The application's `atoms/floating-label`: rests centred in the control, rises 75 % into its top padding when
	`floated`. The field drives `floated` from its focus and value; an input the browser autofilled (`:autofill`, a
	`peer` before the label) floats it too, so the label never sits over a value. The motion is the application's
	(U-12.5): the move (`translate`; `left` where a leading icon is cleared, its `translateX`) and the 75 % `scale`
	together, 200 ms `inOut(quad)` (`duration-label ease-label`), whatever the device's motion setting; the colour
	changes at once, as the application's. The SAME label element floats and rests (its classes change), so the
	transition runs; a first draw with a value is already floated, with no motion.
-->
<label
	data-slot={dataSlot}
	data-floated={floated ? '' : undefined}
	class={cn(
		'pointer-events-none absolute z-10 origin-left transform truncate pr-3 transition-[translate,scale,left] duration-label ease-label',
		geometry.rest,
		floated
			? ['scale-75', geometry.float, geometry.left]
			: [
					'translate-y-0 scale-100',
					leading ? 'left-field-inset' : geometry.left,
					geometry.autofill
				],
		error ? 'text-danger-text' : focused ? 'text-foreground' : 'text-muted-foreground',
		insideBorder && '-mt-px',
		className
	)}
	{...restProps}
>
	{label}
</label>
