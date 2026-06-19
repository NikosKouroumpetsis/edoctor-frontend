<script lang="ts" module>
	import { createContext } from '$shared/lib/headless';

	export type DialogContext = {
		readonly open: boolean;
		readonly modal: boolean;
		readonly contentId: string;
		readonly titleId: string;
		readonly descriptionId: string;
		setOpen: (open: boolean) => void;
	};
	export const [getDialogContext, setDialogContext] = createContext<DialogContext>('Dialog');
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useId } from '$shared/lib/headless';

	let {
		open = $bindable(false),
		modal = true,
		onOpenChange,
		children
	}: {
		open?: boolean;
		modal?: boolean;
		onOpenChange?: (open: boolean) => void;
		children?: Snippet;
	} = $props();

	const id = useId(undefined, 'dialog');

	setDialogContext({
		get open() {
			return open;
		},
		get modal() {
			return modal;
		},
		contentId: `${id}-content`,
		titleId: `${id}-title`,
		descriptionId: `${id}-description`,
		setOpen(next) {
			open = next;
			onOpenChange?.(next);
		}
	});
</script>

{@render children?.()}
