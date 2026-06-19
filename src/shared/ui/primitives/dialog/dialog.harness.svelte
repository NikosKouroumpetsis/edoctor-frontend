<script lang="ts">
	import {
		Dialog,
		DialogTrigger,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogClose
	} from './index';

	let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<Dialog bind:open>
	<DialogTrigger>Open dialog</DialogTrigger>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Confirm booking</DialogTitle>
			<DialogDescription>Please confirm your appointment.</DialogDescription>
		</DialogHeader>
		<DialogClose>Cancel</DialogClose>
	</DialogContent>
</Dialog>
