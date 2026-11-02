import { describe, expect, it } from 'vitest';
import { SearchDock } from './search-dock.svelte';

describe('SearchDock', () => {
	it('U-16.7: the bar’s pill shows only while a registered search is under the bar and not dropped', () => {
		const dock = new SearchDock();
		dock.docked = true;
		expect(dock.pillShown).toBe(false);
		dock.register(true);
		expect(dock.pillShown).toBe(true);
		dock.drop();
		expect(dock.pillShown).toBe(false);
		dock.lift();
		expect(dock.pillShown).toBe(true);
		dock.docked = false;
		expect(dock.pillShown).toBe(false);
	});

	it('U-16.7: a page that leaves takes its search away — not docked, not dropped', () => {
		const dock = new SearchDock();
		dock.register(true);
		dock.docked = true;
		dock.drop();
		dock.register(false);
		expect([dock.available, dock.docked, dock.dropped]).toEqual([false, false, false]);
	});

	it('U-23.2: the page’s choices reach the bar’s pill; a page that leaves takes them away', () => {
		const dock = new SearchDock();
		expect(dock.summary).toEqual({});
		dock.register(true);
		dock.summary = { what: 'Καρδιολόγος', where: 'Πειραιάς' };
		expect(dock.summary).toEqual({ what: 'Καρδιολόγος', where: 'Πειραιάς' });
		dock.register(false);
		expect(dock.summary).toEqual({});
	});

	it('U-16.7: lifting with `restoreFocus` gives the focus back to the pill that dropped it; without it, nowhere', async () => {
		const pill = document.createElement('button');
		document.body.append(pill);
		const dock = new SearchDock();
		dock.register(true);
		dock.drop(pill);
		dock.lift({ restoreFocus: true });
		await Promise.resolve();
		expect(pill).toHaveFocus();
		pill.blur();
		dock.drop(pill);
		dock.lift();
		await Promise.resolve();
		expect(pill).not.toHaveFocus();
		pill.remove();
	});
});
