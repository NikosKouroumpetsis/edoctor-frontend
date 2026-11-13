<script lang="ts">
	import { setSession, type Session } from '$shared/state/session';
	import ProfileTab from './index.svelte';
	import type { ProfileTabProps } from '../types';

	let {
		session,
		bell = false,
		...props
	}: Omit<ProfileTabProps, 'headerAction'> & {
		session: Session;
		/** Hands the title row something for its end (the bell of screen 63 will sit there, D-W45-17). */
		bell?: boolean;
	} = $props();

	// svelte-ignore state_referenced_locally
	setSession(session);
</script>

{#snippet headerAction()}
	<span data-testid="handed-header-action">bell</span>
{/snippet}

<ProfileTab {...props} headerAction={bell ? headerAction : undefined} />
