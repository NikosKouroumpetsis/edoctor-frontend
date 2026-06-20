<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardAction,
		CardContent,
		CardFooter
	} from '$shared/ui/primitives/card';
	import { Button } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Primitives/Card',
		component: Card,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	{#snippet template()}
		<Card class="w-80">
			<CardHeader>
				<CardTitle>Appointment</CardTitle>
				<CardDescription>Cardiology — Dr. Maria Alexiou</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-body-sm text-muted-foreground">
					Tuesday, 24 June 2026 at 10:30. Please arrive 10 minutes early.
				</p>
			</CardContent>
		</Card>
	{/snippet}
</Story>

<Story name="With action">
	{#snippet template()}
		<Card class="w-80">
			<CardHeader>
				<CardTitle>Notifications</CardTitle>
				<CardDescription>Manage your reminders</CardDescription>
				<CardAction>
					<Button variant="ghost" size="sm">Edit</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<p class="text-body-sm text-muted-foreground">Email and SMS reminders are enabled.</p>
			</CardContent>
		</Card>
	{/snippet}
</Story>

<Story name="With footer">
	{#snippet template()}
		<Card class="w-80">
			<CardHeader>
				<CardTitle>Cancel appointment</CardTitle>
				<CardDescription>This action cannot be undone.</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-body-sm text-muted-foreground">
					Cancelling frees the slot for other patients.
				</p>
			</CardContent>
			<CardFooter class="justify-end gap-2">
				<Button variant="outline">Keep</Button>
				<Button variant="destructive">Cancel it</Button>
			</CardFooter>
		</Card>
	{/snippet}
</Story>
