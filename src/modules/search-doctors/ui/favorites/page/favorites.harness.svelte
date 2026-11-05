<script lang="ts">
	import { untrack } from 'svelte';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import Favorites from './index.svelte';

	let {
		status,
		failed = false,
		onRetryRead,
		toasts = new ToastState()
	}: {
		status: SessionStatus;
		failed?: boolean;
		onRetryRead?: () => void;
		toasts?: ToastState;
	} = $props();

	setSession(
		new Session({
			status: () => status,
			member: () => null,
			signOut: async () => undefined,
			failed: () => failed,
			retry: () => onRetryRead?.()
		})
	);
	untrack(() => setToasts(toasts));
</script>

<Favorites locale="el" profileHref={(slug) => `/doctors/${slug}`} searchHref="/" />
