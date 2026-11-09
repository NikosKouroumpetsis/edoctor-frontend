import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import { BookingDraft } from '$modules/appointments/ui/booking-draft';
import Harness from './booking.harness.svelte';
import type { BookingTimeProps } from '../types';

const SLUG = 'maria-triantafyllou';
const HINTS = 'office=off-a&date=2026-11-08&time=09%3A30&service=svc-simple';

beforeEach(() => {
	page.url = new URL(
		`https://edoctor.test/doctors/${SLUG}/booking/time?${HINTS}`
	) as typeof page.url;
	page.state = {};
});

afterEach(() => vi.restoreAllMocks());

const props = (overrides: Partial<Omit<BookingTimeProps, 'picker'>> = {}) => ({
	slug: SLUG,
	locale: 'el' as const,
	href: (path: string) => path,
	profileHref: `/doctors/${SLUG}?service=svc-simple`,
	title: 'Διαθεσιμότητα',
	staged: { officeId: 'off-b', date: '2026-11-09', startMinute: 600 },
	canSave: true,
	serviceId: 'svc-simple',
	...overrides
});

function draw(time = props(), draft = new BookingDraft()) {
	render(QueryHarness, {
		props: { component: Harness as unknown as Component<never>, props: { time, draft } }
	});
	return draft;
}

const user = () => userEvent.setup({ delay: null });
const save = () => screen.getByTestId('booking-save');

describe('«Διαθεσιμότητα» of the booking (record §3.3, U-102)', () => {
	it('U-102: a screen of its own, never a modal — «←», the title, the profile’s picker, «Άκυρο» and «Αποθήκευση»', () => {
		draw();
		expect(screen.getByRole('heading', { level: 1, name: 'Διαθεσιμότητα' })).toBeInTheDocument();
		expect(screen.getByTestId('fake-picker')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Πίσω' })).toHaveAttribute(
			'href',
			`/doctors/${SLUG}/booking?${HINTS}`
		);
		expect(screen.getByTestId('booking-cancel')).toHaveTextContent('Άκυρο');
		expect(save()).toHaveTextContent('Αποθήκευση');
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('U-104.2 / D-W3-27 / U-81.2: «Αποθήκευση» fully round; no colour under the pointer; the bar pinned below 744, in the flow from it', () => {
		draw();
		expect(save()).toHaveClass('rounded-full');
		const barNode = document.querySelector('[data-slot="booking-change-bar"]') as HTMLElement;
		expect(barNode).toHaveClass('fixed', 'bottom-0', 'tablet:static');
		for (const node of [barNode, ...barNode.querySelectorAll('*')]) {
			expect([...node.classList].filter((name) => name.includes('hover:'))).toEqual([]);
		}
		expect(screen.queryByRole('progressbar')).toBeNull();
	});

	it('«Αποθήκευση» writes the new hour into the draft and goes back to screen 30 — one step back when it came from there', async () => {
		page.state = { booking: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		const draft = draw();
		await user().click(save());
		expect(draft.slot).toEqual({ officeId: 'off-b', date: '2026-11-09', startMinute: 600 });
		expect(draft.slotServiceId).toBe('svc-simple');
		expect(go).toHaveBeenCalledWith(-1);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('opened from a link (nothing behind): it replaces itself with screen 30, which carries the new hour', async () => {
		draw();
		await user().click(save());
		expect(vi.mocked(goto)).toHaveBeenCalledWith(
			`/doctors/${SLUG}/booking?office=off-b&date=2026-11-09&time=10%3A00&service=svc-simple`,
			{ replaceState: true }
		);
	});

	it('(negative) an hour the window does not offer: «Αποθήκευση» is locked and writes nothing; «Άκυρο» keeps the old hour', async () => {
		const draft = draw(props({ canSave: false }));
		expect(save()).toBeDisabled();
		await user().click(screen.getByTestId('booking-cancel'));
		expect(draft.slot).toEqual({ officeId: 'off-a', date: '2026-11-08', startMinute: 570 });
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctors/${SLUG}/booking?${HINTS}`, {
			replaceState: true
		});
	});

	it('review w3-w2 R1 MINOR-2: with no hour behind it (the 307 of an address that named none) «Άκυρο» and «←» go to the doctor — never round to this screen again', async () => {
		page.url = new URL(
			`https://edoctor.test/doctors/${SLUG}/booking/time?service=svc-simple`
		) as typeof page.url;
		draw(props({ staged: null, canSave: false }));
		expect(screen.getByRole('link', { name: 'Πίσω' })).toHaveAttribute(
			'href',
			`/doctors/${SLUG}?service=svc-simple`
		);
		await user().click(screen.getByTestId('booking-cancel'));
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctors/${SLUG}?service=svc-simple`, {
			replaceState: true
		});
	});
});
