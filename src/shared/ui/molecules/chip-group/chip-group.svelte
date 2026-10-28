<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { handleRovingKeydown } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import {
		setChipGroupContext,
		type ChipGroupEntry,
		type ChipGroupType
	} from '$shared/ui/primitives/chip';

	let {
		type = 'multiple',
		class: className,
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		/** `single`: the chips are radios of one choice; `multiple`: each chip toggles on its own. */
		type?: ChipGroupType;
		children: Snippet;
	} = $props();

	let ref = $state<HTMLDivElement | null>(null);
	let entries = $state.raw<{ id: string; read: ChipGroupEntry }[]>([]);

	// The Tab stop of one choice: the chosen chip, else the first radio (the radio pattern, like `radio-group`).
	const tabStop = $derived.by(() => {
		const radios = entries.filter((entry) => entry.read().eligible);
		return (radios.find((entry) => entry.read().selected) ?? radios[0])?.id;
	});

	setChipGroupContext({
		get type() {
			return type;
		},
		get tabStop() {
			return tabStop;
		},
		register(id, read) {
			entries = [...entries, { id, read }];
			return () => {
				entries = entries.filter((entry) => entry.id !== id);
			};
		}
	});

	// The arrows move to the next radio AND choose it, as in a native radio group; from a chip that is not one of
	// the radios (a removable chip in the row) they do nothing, so they never pick a radio the user did not reach.
	function onkeydown(event: KeyboardEvent) {
		if (type !== 'single' || !ref) return;
		if (!(event.target instanceof HTMLElement) || !event.target.hasAttribute('data-roving-item'))
			return;
		handleRovingKeydown(event, ref, { orientation: 'horizontal' })?.click();
	}
</script>

<!-- The row of chips the application writes inline (`flex-row flex-wrap gap-2`), with its semantics. -->
<div
	bind:this={ref}
	role={type === 'single' ? 'radiogroup' : 'group'}
	data-slot="chip-group"
	data-type={type}
	class={cn('flex flex-row flex-wrap gap-2', className)}
	{onkeydown}
	{...restProps}
>
	{@render children()}
</div>
