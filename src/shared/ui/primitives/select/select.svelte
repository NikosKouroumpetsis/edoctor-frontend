<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type SelectContext = {
		readonly value: string | undefined;
		readonly open: boolean;
		readonly contentId: string;
		readonly triggerId: string;
		readonly triggerEl: HTMLElement | null;
		readonly disabled: boolean;
		labelFor: (value: string) => string | undefined;
		setOpen: (open: boolean) => void;
		setTriggerEl: (el: HTMLElement | null) => void;
		select: (value: string) => void;
		registerItem: (value: string, label: string) => void;
		unregisterItem: (value: string) => void;
	};
	export const [getSelectContext, setSelectContext] = createContext<SelectContext>('Select');
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { useId } from '$shared/lib/headless';

	let {
		value = $bindable(),
		open = $bindable(false),
		disabled = false,
		name,
		onValueChange,
		onOpenChange,
		children
	}: {
		value?: string;
		open?: boolean;
		disabled?: boolean;
		name?: string;
		onValueChange?: (value: string) => void;
		onOpenChange?: (open: boolean) => void;
		children?: Snippet;
	} = $props();

	const id = useId(undefined, 'select');
	let triggerEl = $state<HTMLElement | null>(null);
	// Reactive so <SelectValue> updates when items register their labels.
	const labels = new SvelteMap<string, string>();

	setSelectContext({
		get value() {
			return value;
		},
		get open() {
			return open;
		},
		contentId: `${id}-content`,
		triggerId: `${id}-trigger`,
		get triggerEl() {
			return triggerEl;
		},
		get disabled() {
			return disabled;
		},
		labelFor(v) {
			return labels.get(v);
		},
		setOpen(next) {
			if (disabled) return;
			open = next;
			onOpenChange?.(next);
		},
		setTriggerEl(el) {
			triggerEl = el;
		},
		select(next) {
			value = next;
			onValueChange?.(next);
			open = false;
			onOpenChange?.(false);
			triggerEl?.focus();
		},
		registerItem(v, label) {
			labels.set(v, label);
		},
		unregisterItem(v) {
			labels.delete(v);
		}
	});
</script>

{@render children?.()}

{#if name}
	<input type="hidden" {name} value={value ?? ''} />
{/if}
