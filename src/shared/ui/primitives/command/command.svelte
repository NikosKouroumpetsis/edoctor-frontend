<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	type CommandItemEntry = { id: string; value: string; groupId?: string; onSelect: () => void };

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
		registerGroup: (id: string) => void;
		unregisterGroup: (id: string) => void;
		/** A group hides when it has items and none matches; a shown group after another shown one is separated. */
		groupState: (id: string) => { hidden: boolean; separated: boolean };
	};
	export const [getCommandContext, setCommandContext] = createContext<CommandContext>('Command');

	/** The group an item sits in, so a group without a match hides and the next one draws the line. */
	export const [, setCommandGroupContext, getCommandGroupContext] = createContext<{ id: string }>(
		'CommandGroup'
	);
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
	let groups = $state<string[]>([]);

	function matches(itemValue: string): boolean {
		return itemValue.toLowerCase().includes(value.toLowerCase());
	}

	const visibleItems = $derived(items.filter((i) => matches(i.value)));
	// Before its items mount (and on the server) a group shows: only a group whose items all miss hides.
	const visibleGroups = $derived(
		groups.filter((groupId) => {
			const own = items.filter((item) => item.groupId === groupId);
			return own.length === 0 || own.some((item) => matches(item.value));
		})
	);

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
		},
		registerGroup(groupId) {
			if (groups.includes(groupId)) return;
			// In DOM order, not mount order: a group that mounts later above another (a `{#if}`, data that
			// arrives) takes its place, so the line is drawn between the shown groups as the reader sees them.
			groups = [...groups, groupId].sort((a, b) => {
				const first = document.getElementById(a);
				const second = document.getElementById(b);
				if (!first || !second) return 0;
				return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
			});
		},
		unregisterGroup(groupId) {
			groups = groups.filter((g) => g !== groupId);
		},
		groupState(groupId) {
			if (!groups.includes(groupId)) return { hidden: false, separated: false };
			const place = visibleGroups.indexOf(groupId);
			return { hidden: place === -1, separated: place > 0 };
		}
	});
</script>

<div
	bind:this={ref}
	data-slot="command"
	class={cn(
		'flex w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
