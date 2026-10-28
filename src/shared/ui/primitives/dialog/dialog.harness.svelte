<script lang="ts">
	import {
		Dialog,
		DialogTrigger,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogClose,
		type DialogSize
	} from './index';
	import { Popover, PopoverContent, PopoverTrigger } from '$shared/ui/primitives/popover';

	let {
		open = $bindable(false),
		size,
		withPopover = false
	}: { open?: boolean; size?: DialogSize; withPopover?: boolean } = $props();
</script>

<Dialog bind:open>
	<DialogTrigger>Open dialog</DialogTrigger>
	<DialogContent {size} closeLabel="Close">
		<DialogHeader>
			<DialogTitle>Confirm booking</DialogTitle>
			<DialogDescription>Please confirm your appointment.</DialogDescription>
		</DialogHeader>
		<DialogClose>Cancel</DialogClose>
		{#if withPopover}
			<Popover>
				<PopoverTrigger class="min-h-touch min-w-touch">Specialty</PopoverTrigger>
				<PopoverContent>
					<button type="button" class="size-touch">Cardiology</button>
				</PopoverContent>
			</Popover>
		{/if}
	</DialogContent>
</Dialog>
