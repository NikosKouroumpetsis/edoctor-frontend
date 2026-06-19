<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type HoverCardContext = {
		readonly open: boolean;
		readonly contentId: string;
		readonly triggerEl: HTMLElement | null;
		setTriggerEl: (el: HTMLElement | null) => void;
		openWithDelay: () => void;
		close: () => void;
	};
	export const [getHoverCardContext, setHoverCardContext] =
		createContext<HoverCardContext>('HoverCard');
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useId } from '$shared/lib/headless';

	let {
		open = $bindable(false),
		openDelay = 300,
		closeDelay = 200,
		onOpenChange,
		children
	}: {
		open?: boolean;
		openDelay?: number;
		closeDelay?: number;
		onOpenChange?: (open: boolean) => void;
		children?: Snippet;
	} = $props();

	const id = useId(undefined, 'hovercard');
	let triggerEl = $state<HTMLElement | null>(null);
	let openTimer: ReturnType<typeof setTimeout> | null = null;
	let closeTimer: ReturnType<typeof setTimeout> | null = null;

	function set(next: boolean) {
		open = next;
		onOpenChange?.(next);
	}
	function clearTimers() {
		if (openTimer) clearTimeout(openTimer);
		if (closeTimer) clearTimeout(closeTimer);
		openTimer = closeTimer = null;
	}

	setHoverCardContext({
		get open() {
			return open;
		},
		contentId: `${id}-content`,
		get triggerEl() {
			return triggerEl;
		},
		setTriggerEl(el) {
			triggerEl = el;
		},
		openWithDelay() {
			clearTimers();
			openTimer = setTimeout(() => set(true), openDelay);
		},
		close() {
			clearTimers();
			closeTimer = setTimeout(() => set(false), closeDelay);
		}
	});
</script>

{@render children?.()}
