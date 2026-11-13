<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';

	let {
		locale,
		part,
		onRetry
	}: {
		locale: SupportedLocale;
		/** The part that could not be read: `security-<part>-failed`, `security-<part>-retry`. */
		part: 'password' | 'providers' | 'devices';
		onRetry: () => void;
	} = $props();

	const options = $derived({ locale });
</script>

<!-- A part whose read did not come back: it says so in its own place, with «Δοκιμάστε ξανά» — the other parts of the
     page stay as they are. -->
<div class="pt-3">
	<InlineNotice
		variant="muted"
		role="alert"
		message={m.auth_security_read_failed_body({}, options)}
		actionLabel={m.auth_security_read_failed_retry({}, options)}
		onAction={onRetry}
		testId={`security-${part}-failed`}
		actionTestId={`security-${part}-retry`}
	/>
</div>
