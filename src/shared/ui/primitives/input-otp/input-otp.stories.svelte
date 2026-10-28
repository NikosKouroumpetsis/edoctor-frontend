<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { InputOTP, InputOTPGroup, InputOTPSlot } from '$shared/ui/primitives/input-otp';

	// The application's meta (`atoms/input-otp`): its `accessibilityLabel` / `length` are the web's `label` /
	// `maxlength`; the web draws the slots by composition.
	const { Story } = defineMeta({
		title: 'Primitives/InputOTP',
		component: InputOTP,
		tags: ['autodocs'],
		args: {
			label: 'Κωδικός μίας χρήσης',
			maxlength: 6,
			invalid: false,
			disabled: false,
			size: 'md'
		},
		argTypes: {
			maxlength: { control: 'number' },
			invalid: { control: 'boolean' },
			disabled: { control: 'boolean' },
			size: { control: 'select', options: ['sm', 'md', 'lg'] }
		}
	});
</script>

<script lang="ts">
	let value = $state('');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<InputOTP {...args} bind:value>
				<InputOTPGroup>
					{#each Array.from({ length: args.maxlength ?? 6 }, (_, i) => i) as index (index)}
						<InputOTPSlot {index} />
					{/each}
				</InputOTPGroup>
			</InputOTP>
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-4">
			{#each ['sm', 'md', 'lg'] as const as size (size)}
				<InputOTP {...args} maxlength={4} {size} value="12">
					<InputOTPGroup>
						{#each [0, 1, 2, 3] as index (index)}<InputOTPSlot {index} />{/each}
					</InputOTPGroup>
				</InputOTP>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Invalid" args={{ invalid: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<InputOTP {...args} value="12">
				<InputOTPGroup>
					{#each [0, 1, 2, 3, 4, 5] as index (index)}<InputOTPSlot {index} />{/each}
				</InputOTPGroup>
			</InputOTP>
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-narrow">
			<InputOTP {...args} value="123">
				<InputOTPGroup>
					{#each [0, 1, 2, 3, 4, 5] as index (index)}<InputOTPSlot {index} />{/each}
				</InputOTPGroup>
			</InputOTP>
		</div>
	{/snippet}
</Story>
