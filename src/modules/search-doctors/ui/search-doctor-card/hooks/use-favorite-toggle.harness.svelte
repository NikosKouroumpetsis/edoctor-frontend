<script lang="ts">
	import { untrack } from 'svelte';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, type ToastState } from '$shared/ui/molecules/toast';
	import { forgetPendingFavorite } from '$modules/search-doctors/lib/favorites';
	import { useFavoriteToggle } from './use-favorite-toggle.svelte';

	let {
		status,
		toasts,
		onReady,
		doctors = [{ id: 'd1', imageUrl: 'https://cdn.test/d1.jpg' }, { id: 'd2' }]
	}: {
		status: SessionStatus;
		toasts: ToastState;
		onReady?: (ready: { session: Session; setStatus: (next: SessionStatus) => void }) => void;
		doctors?: { id: string; imageUrl?: string }[];
	} = $props();

	let current = $state(untrack(() => status));
	const session = setSession(
		new Session({
			status: () => current,
			member: () => null,
			signOut: async () => undefined,
			abandoned: forgetPendingFavorite
		})
	);
	untrack(() => {
		onReady?.({ session, setStatus: (next) => (current = next) });
		setToasts(toasts);
	});
	const favorites = useFavoriteToggle(() => 'el');
</script>

{#each doctors as doctor (doctor.id)}
	<button
		type="button"
		class="min-h-touch min-w-touch"
		data-testid={`heart-${doctor.id}`}
		aria-pressed={favorites.isSaved(doctor.id)}
		data-pop={favorites.isPopping(doctor.id)}
		onclick={() => favorites.toggle(doctor)}
	>
		{doctor.id}
	</button>
{/each}
