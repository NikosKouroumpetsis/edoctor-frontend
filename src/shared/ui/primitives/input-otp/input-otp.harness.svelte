<script lang="ts">
	import { InputOTP, InputOTPGroup, InputOTPSlot } from './index';

	import type { InputOtpSize } from './index';

	let {
		maxlength = 6,
		onComplete,
		size,
		invalid = false
	}: {
		maxlength?: number;
		onComplete?: (value: string) => void;
		size?: InputOtpSize;
		invalid?: boolean;
	} = $props();

	let value = $state('');
</script>

<InputOTP bind:value {maxlength} {onComplete} {size} {invalid} label="One-time passcode">
	<InputOTPGroup>
		{#each [...Array(maxlength).keys()] as index (index)}
			<InputOTPSlot {index} />
		{/each}
	</InputOTPGroup>
</InputOTP>

<p data-testid="otp-value">{value}</p>
