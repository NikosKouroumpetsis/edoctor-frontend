<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, screen } from 'storybook/test';
	import {
		Dialog,
		DialogTrigger,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter,
		DialogClose
	} from '$shared/ui/primitives/dialog';
	import { buttonVariants } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Primitives/Dialog',
		component: Dialog,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	{#snippet template()}
		<Dialog>
			<DialogTrigger class={buttonVariants()}>Open dialog</DialogTrigger>
			<DialogContent class="max-w-md">
				<DialogHeader>
					<DialogTitle>Confirm booking</DialogTitle>
					<DialogDescription>Confirm your appointment with the doctor.</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	{/snippet}
</Story>

<Story name="With footer">
	{#snippet template()}
		<Dialog>
			<DialogTrigger class={buttonVariants()}>Open dialog</DialogTrigger>
			<DialogContent class="max-w-md">
				<DialogHeader>
					<DialogTitle>Cancel appointment</DialogTitle>
					<DialogDescription>This action cannot be undone.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose class={buttonVariants({ variant: 'outline' })}>Keep</DialogClose>
					<DialogClose class={buttonVariants({ variant: 'destructive' })}>Cancel it</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each ['sm', 'default', 'lg'] as const as size (size)}
				<Dialog>
					<DialogTrigger class={buttonVariants({ variant: 'outline' })}>Open {size}</DialogTrigger>
					<DialogContent {size}>
						<DialogHeader>
							<DialogTitle>Size {size}</DialogTitle>
							<DialogDescription>The dialog panel uses the {size} max-width.</DialogDescription>
						</DialogHeader>
					</DialogContent>
				</Dialog>
			{/each}
		</div>
	{/snippet}
</Story>

<Story
	name="Opened"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));
		await expect(await screen.findByRole('dialog')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<Dialog>
			<DialogTrigger class={buttonVariants()}>Open dialog</DialogTrigger>
			<DialogContent class="max-w-md">
				<DialogHeader>
					<DialogTitle>Confirm</DialogTitle>
					<DialogDescription>The dialog is opened by the play function.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose class={buttonVariants({ variant: 'outline' })}>Close</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	{/snippet}
</Story>
