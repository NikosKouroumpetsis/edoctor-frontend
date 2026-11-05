<script lang="ts">
	import { InputOTP, InputOTPSlot } from '$shared/ui/primitives/input-otp';
	import { authCodeLength } from '$modules/auth/config/sign-in';

	let {
		value = $bindable(''),
		label,
		invalid = false
	}: { value?: string; label: string; invalid?: boolean } = $props();
</script>

<!-- InputOtp lg: one box 64, six cells, «-» when empty. It never submits: «Συνέχεια» does, when asked. -->
<InputOTP bind:value maxlength={authCodeLength} size="lg" {label} {invalid} data-testid="auth-code">
	{#each { length: authCodeLength }, index (index)}
		<InputOTPSlot {index} />
	{/each}
</InputOTP>
