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
		DialogClose,
		type DialogSize
	} from '$shared/ui/primitives/dialog';
	import { buttonClasses } from '$shared/ui/primitives/button';

	const sizes: DialogSize[] = ['sm', 'md', 'lg'];

	// The application's dialog (`molecules/dialog`): «Άνοιγμα» opens «Διαγραφή λογαριασμού». It fades in and grows from
	// 95 % (U-09.8), and the focus lands on the panel, not on its «×» (U-09.7): Tab reaches the «×» first.
	const { Story } = defineMeta({
		title: 'Primitives/Dialog',
		component: Dialog,
		tags: ['autodocs']
	});
</script>

<Story
	name="Playground"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Άνοιγμα' }));
		await expect(await screen.findByRole('dialog')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<Dialog>
			<DialogTrigger class={buttonClasses()}>Άνοιγμα</DialogTrigger>
			<DialogContent closeLabel="Κλείσιμο">
				<DialogHeader>
					<DialogTitle>Διαγραφή λογαριασμού</DialogTitle>
					<DialogDescription>
						Αυτή η ενέργεια είναι μόνιμη και δεν μπορεί να αναιρεθεί.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose class={buttonClasses({ tone: 'ghost' })}>Άκυρο</DialogClose>
					<DialogClose class={buttonClasses()}>Διαγραφή</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each sizes as size (size)}
				<Dialog>
					<DialogTrigger class={buttonClasses()}>Άνοιγμα {size}</DialogTrigger>
					<DialogContent {size} closeLabel="Κλείσιμο">
						<DialogHeader>
							<DialogTitle>Μέγεθος {size}</DialogTitle>
							<DialogDescription>Το παράθυρο έχει το μέγιστο πλάτος του {size}.</DialogDescription>
						</DialogHeader>
					</DialogContent>
				</Dialog>
			{/each}
		</div>
	{/snippet}
</Story>
