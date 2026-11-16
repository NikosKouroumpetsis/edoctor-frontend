import { describe, expect, it } from 'vitest';
import { createRawSnippet, flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import { DoctorStanding } from '$shared/state/doctor-standing';
import { Session } from '$shared/state/session';
import SessionHarness from './session.harness.svelte';

const children = createRawSnippet(() => ({ render: () => '<main><h1>Σελίδα</h1></main>' }));

describe('SiteFrame · wave 5.1, screen 64 — a switch the server did not keep', () => {
	it('the person stays where they are and is told (the sign-out’s way, R-2)', async () => {
		let failures = $state(0);
		const standing = new DoctorStanding({
			facts: () => ({ kind: 'doctor', notice: null, lastMode: 'PATIENT', card: null }),
			switchTo: async () => false,
			failures: () => failures
		});
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Μαρία' }),
			signOut: async () => undefined
		});
		render(SessionHarness, { props: { session, standing, children } });
		expect(screen.queryByText('Κάτι πήγε στραβά. Δοκιμάστε ξανά.')).toBeNull();
		failures = 1;
		flushSync();
		expect(await screen.findByText('Κάτι πήγε στραβά. Δοκιμάστε ξανά.')).toBeInTheDocument();
	});
});
