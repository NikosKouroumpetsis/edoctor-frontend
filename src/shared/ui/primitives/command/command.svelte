<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	type CommandItemEntry = { id: string; value: string; onSelect: () => void };

	export type CommandContext = {
		readonly search: string;
		readonly activeId: string | undefined;
		readonly listId: string;
		readonly inputId: string;
		setSearch: (value: string) => void;
		matches: (value: string) => boolean;
		isActive: (id: string) => boolean;
		setActiveId: (id: string) => void;
		move: (direction: 1 | -1) => void;
		selectActive: () => void;
		registerItem: (entry: CommandItemEntry) => void;
		unregisterItem: (id: string) => void;
	};
	export const [getCommandContext, setCommandContext] = createContext<CommandContext>('Command');
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$shared/lib/utils';
	import { useId } from '$shared/lib/headless';

	let {
		ref = $bindable(null),
		value = $bindable(''),
		class: className,
		onValueChange,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string;
		onValueChange?: (value: string) => void;
	} = $props();

	const id = useId(undefined, 'command');
	let activeId = $state<string | undefined>(undefined);
	let items = $state<CommandItemEntry[]>([]);

	function matches(itemValue: string): boolean {
		return itemValue.toLowerCase().includes(value.toLowerCase());
	}

	const visibleItems = $derived(items.filter((i) => matches(i.value)));

	// Keep the active descendant on a visible item as the query changes.
	$effect(() => {
		if (!visibleItems.some((i) => i.id === activeId)) {
			activeId = visibleItems[0]?.id;
		}
	});

	setCommandContext({
		get search() {
			return value;
		},
		get activeId() {
			return activeId;
		},
		listId: `${id}-list`,
		inputId: `${id}-input`,
		setSearch(next) {
			value = next;
			onValueChange?.(next);
		},
		matches,
		isActive(itemId) {
			return activeId === itemId;
		},
		setActiveId(itemId) {
			activeId = itemId;
		},
		move(direction) {
			if (visibleItems.length === 0) return;
			const index = visibleItems.findIndex((i) => i.id === activeId);
			let next = index + direction;
			if (next < 0) next = visibleItems.length - 1;
			if (next >= visibleItems.length) next = 0;
			activeId = visibleItems[next].id;
		},
		selectActive() {
			items.find((i) => i.id === activeId)?.onSelect();
		},
		registerItem(entry) {
			if (!items.some((i) => i.id === entry.id)) items.push(entry);
		},
		unregisterItem(itemId) {
			items = items.filter((i) => i.id !== itemId);
		}
	});
</script>

<div
	bind:this={ref}
	data-slot="command"
	class={cn(
		'flex w-full flex-col overflow-hidden rounded-control bg-popover text-popover-foreground',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
