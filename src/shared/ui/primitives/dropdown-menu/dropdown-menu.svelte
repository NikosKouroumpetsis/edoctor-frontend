<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type DropdownMenuContext = {
		readonly open: boolean;
		readonly contentId: string;
		readonly triggerId: string;
		readonly triggerEl: HTMLElement | null;
		setOpen: (open: boolean) => void;
		setTriggerEl: (el: HTMLElement | null) => void;
	};
	export const [getDropdownMenuContext, setDropdownMenuContext] =
		createContext<DropdownMenuContext>('DropdownMenu');
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

	const id = useId(undefined, 'menu');
	let triggerEl = $state<HTMLElement | null>(null);

	setDropdownMenuContext({
		get open() {
			return open;
		},
		contentId: `${id}-content`,
		triggerId: `${id}-trigger`,
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
