<script lang="ts">
	import { setDoctorStanding, type DoctorStanding } from '$shared/state/doctor-standing';
	import { setSession, type Session } from '$shared/state/session';
	import ProfileTab from './index.svelte';
	import type { ProfileTabProps } from '../types';

	let {
		session,
		standing,
		bell = false,
		...props
	}: Omit<ProfileTabProps, 'headerAction'> & {
		session: Session;
		/** Wave 5.1 · screen 64: the account's doctor standing, when the test hands one (the layout's host's). */
		standing?: DoctorStanding;
		/** Hands the title row something for its end (the bell of screen 63 will sit there, D-W45-17). */
		bell?: boolean;
	} = $props();

	// svelte-ignore state_referenced_locally
	setSession(session);
	// svelte-ignore state_referenced_locally
	if (standing) setDoctorStanding(standing);
</script>

{#snippet headerAction()}
	<span data-testid="handed-header-action">bell</span>
{/snippet}

<ProfileTab {...props} headerAction={bell ? headerAction : undefined} />
