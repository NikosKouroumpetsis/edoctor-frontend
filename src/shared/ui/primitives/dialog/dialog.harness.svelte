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

	let { open = $bindable(false), size = 'default' }: { open?: boolean; size?: DialogSize } =
		$props();
</script>

<Dialog bind:open>
	<DialogTrigger>Open dialog</DialogTrigger>
	<DialogContent {size}>
		<DialogHeader>
			<DialogTitle>Confirm booking</DialogTitle>
			<DialogDescription>Please confirm your appointment.</DialogDescription>
		</DialogHeader>
		<DialogClose>Cancel</DialogClose>
	</DialogContent>
</Dialog>
