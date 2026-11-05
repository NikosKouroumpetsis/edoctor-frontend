<script lang="ts">
	import { getSession } from '$shared/state/session';

	let { onSignedIn }: { onSignedIn?: () => void } = $props();

	const session = getSession();
</script>

<!-- Tests only: what a card does — asks for the sign-in, and goes on after it. -->
<p data-testid="status">{session.status}</p>
<p data-testid="forgotten">{session.forgotten}</p>
<p data-testid="sign-out-failures">{session.signOutFailures}</p>
<p data-testid="patient-profile">{String(session.member?.hasPatientProfile)}</p>
<button
	type="button"
	class="min-h-touch min-w-touch"
	data-testid="expire"
	onclick={() => session.expire({ onSignedIn })}>expire</button
>
<button
	type="button"
	class="min-h-touch min-w-touch"
	data-testid="reread"
	onclick={() => session.retryRead()}>reread</button
>
<button
	type="button"
	class="min-h-touch min-w-touch"
	data-testid="ask"
	onclick={() => session.requireSignIn({ action: 'book', onSignedIn })}>ask</button
>
<button
	type="button"
	class="min-h-touch min-w-touch"
	data-testid="sign-out"
	onclick={() => session.signOut()}>out</button
>
