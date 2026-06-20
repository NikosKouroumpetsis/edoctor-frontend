<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		InputOTP,
		InputOTPGroup,
		InputOTPSlot,
		InputOTPSeparator
	} from '$shared/ui/primitives/input-otp';

	const { Story } = defineMeta({
		title: 'Primitives/InputOTP',
		component: InputOTP,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let value = $state('');
	let completed = $state('');
</script>

<Story name="Six digits (grouped)">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			<InputOTP bind:value maxlength={6} onComplete={(v) => (completed = v)}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
				</InputOTPGroup>
				<InputOTPSeparator />
				<InputOTPGroup>
					<InputOTPSlot index={3} />
					<InputOTPSlot index={4} />
					<InputOTPSlot index={5} />
				</InputOTPGroup>
			</InputOTP>
			<p class="text-sm text-muted-foreground">
				Value: {value || '—'} · Completed: {completed || '—'}
			</p>
		</div>
	{/snippet}
</Story>

<Story name="Four digits (continuous)">
	{#snippet template()}
		<InputOTP maxlength={4}>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
			</InputOTPGroup>
		</InputOTP>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<InputOTP maxlength={4} disabled>
			<InputOTPGroup>
				<InputOTPSlot index={0} />
				<InputOTPSlot index={1} />
				<InputOTPSlot index={2} />
				<InputOTPSlot index={3} />
			</InputOTPGroup>
		</InputOTP>
	{/snippet}
</Story>
