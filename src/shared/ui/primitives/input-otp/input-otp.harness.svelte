<script lang="ts">
	import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from './index';

	let { maxlength = 6, onComplete }: { maxlength?: number; onComplete?: (value: string) => void } =
		$props();

	let value = $state('');
</script>

<InputOTP bind:value {maxlength} {onComplete}>
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

<p data-testid="otp-value">{value}</p>
