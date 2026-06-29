<script lang="ts">
	import { InputOTP, InputOTPGroup, InputOTPSlot } from './index';

	let { maxlength = 6, onComplete }: { maxlength?: number; onComplete?: (value: string) => void } =
		$props();

	let value = $state('');
</script>

<InputOTP bind:value {maxlength} {onComplete}>
	<InputOTPGroup>
		{#each [...Array(maxlength).keys()] as index (index)}
			<InputOTPSlot {index} />
		{/each}
	</InputOTPGroup>
</InputOTP>

<p data-testid="otp-value">{value}</p>
