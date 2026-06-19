<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type PopoverContext = {
		readonly open: boolean;
		readonly contentId: string;
		readonly triggerEl: HTMLElement | null;
		setOpen: (open: boolean) => void;
		setTriggerEl: (el: HTMLElement | null) => void;
	};
	export const [getPopoverContext, setPopoverContext] = createContext<PopoverContext>('Popover');
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useId } from '$shared/lib/headless';

	let {
		open = $bindable(false),
		onOpenChange,
		children
	}: {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		children?: Snippet;
	} = $props();

	const id = useId(undefined, 'popover');
	let triggerEl = $state<HTMLElement | null>(null);

	setPopoverContext({
		get open() {
			return open;
		},
		contentId: `${id}-content`,
		get triggerEl() {
			return triggerEl;
		},
		setOpen(next) {
			open = next;
			onOpenChange?.(next);
		},
		setTriggerEl(el) {
			triggerEl = el;
		}
	});
</script>

{@render children?.()}
