<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { InputOTP, InputOTPGroup, InputOTPSlot } from '$shared/ui/primitives/input-otp';

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

<Story name="Six digits">
	{#snippet template()}
		<div class="flex w-72 flex-col gap-3">
			<InputOTP bind:value maxlength={6} onComplete={(v) => (completed = v)}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
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

<Story name="Four digits">
	{#snippet template()}
		<div class="w-48">
			<InputOTP maxlength={4}>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
					<InputOTPSlot index={3} />
				</InputOTPGroup>
			</InputOTP>
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<div class="w-72">
			<InputOTP maxlength={6} disabled>
				<InputOTPGroup>
					<InputOTPSlot index={0} />
					<InputOTPSlot index={1} />
					<InputOTPSlot index={2} />
					<InputOTPSlot index={3} />
					<InputOTPSlot index={4} />
					<InputOTPSlot index={5} />
				</InputOTPGroup>
			</InputOTP>
		</div>
	{/snippet}
</Story>
