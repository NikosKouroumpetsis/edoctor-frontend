import { afterEach, describe, expect, it, vi } from 'vitest';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { useHistorySteps } from './use-history-steps.svelte';

describe('shared::lib::navigation::useHistorySteps (U-102 · D-W3-31; shared since D-W51-50)', () => {
	afterEach(() => {
		page.state = {};
		vi.restoreAllMocks();
	});

	it('opens a step screen as one more entry, its depth under the caller’s own key; in place keeps scroll and focus', () => {
		const steps = useHistorySteps('doctorAppointment');
		steps.open('/doctor/appointments/a/reject', 1);
		expect(goto).toHaveBeenLastCalledWith('/doctor/appointments/a/reject', {
			state: { doctorAppointment: { depth: 1 } }
		});
		steps.open('/x', 2, true);
		expect(goto).toHaveBeenLastCalledWith('/x', {
			state: { doctorAppointment: { depth: 2 } },
			noScroll: true,
			keepFocus: true
		});
	});

	it('opened from its page (depth 1) leaving goes back that one step — once, however often it is asked', () => {
		page.state = { doctorAppointment: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		const steps = useHistorySteps('doctorAppointment');
		expect(steps.depth).toBe(1);
		steps.leave('/doctor/appointments/a');
		steps.leave('/doctor/appointments/a');
		expect(go).toHaveBeenCalledOnce();
		expect(go).toHaveBeenCalledWith(-1);
		expect(goto).not.toHaveBeenCalled();
	});

	it('(negative) opened from a link, a reload, another page or another flow: leaving REPLACES it with the page it belongs to', () => {
		page.state = { appointment: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		useHistorySteps('doctorAppointment').leave('/doctor/appointments/a?tab=requests');
		expect(go).not.toHaveBeenCalled();
		expect(goto).toHaveBeenCalledWith('/doctor/appointments/a?tab=requests', {
			replaceState: true
		});
	});
});
