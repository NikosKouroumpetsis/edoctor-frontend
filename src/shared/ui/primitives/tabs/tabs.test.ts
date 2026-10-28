import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './tabs.harness.svelte';

describe('Tabs', () => {
	it('shows only the active panel and wires ARIA relationships', () => {
		render(Harness, { props: { value: 'account' } });
		const accountTab = screen.getByRole('tab', { name: 'Account' });
		expect(accountTab).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Account panel');
		expect(accountTab).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
	});

	it('switches the panel on click', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { value: 'account' } });
		await user.click(screen.getByRole('tab', { name: 'Password' }));
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Password panel');
		expect(screen.getByRole('tab', { name: 'Password' })).toHaveAttribute('aria-selected', 'true');
	});

	it('R7-5 (U-09.15): the trigger takes the application’s 8 corner (`rounded-sm`), not the former 12', () => {
		render(Harness, { props: { value: 'account' } });
		const app = readFileSync(
			resolve(process.cwd(), '../application/src/shared/ui/molecules/tabs/index.tsx'),
			'utf8'
		);
		expect(app).toMatch(/min-h-touch min-w-touch flex-1 [^']*\brounded-sm\b/);
		for (const tab of screen.getAllByRole('tab')) {
			expect(tab).toHaveClass('rounded-sm');
			expect(tab).not.toHaveClass('rounded-md');
		}
	});

	it('navigates with arrow keys (automatic activation)', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { value: 'account' } });
		screen.getByRole('tab', { name: 'Account' }).focus();
		await user.keyboard('{ArrowRight}');
		expect(screen.getByRole('tab', { name: 'Password' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tabpanel')).toHaveTextContent('Password panel');
	});
	describe('the sliding pill (U-12.4)', () => {
		// jsdom lays nothing out: each tab reports its box in the list (across: 4 / 104; down: 4 / 52).
		const boxes = {
			horizontal: { account: [4, 4, 100], password: [104, 4, 120] },
			vertical: { account: [4, 4, 120], password: [4, 52, 120] }
		};
		const surfaceAtCommit: string[] = [];
		function layOut(orientation: 'horizontal' | 'vertical') {
			const boxOf = (element: HTMLElement) =>
				element.dataset.slot === 'tabs-trigger'
					? boxes[orientation][element.dataset.value as 'account' | 'password']
					: undefined;
			vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
				this: HTMLElement
			) {
				return boxOf(this)?.[0] ?? 0;
			});
			vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
				this: HTMLElement
			) {
				return boxOf(this)?.[1] ?? 0;
			});
			vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
				this: HTMLElement
			) {
				// The list reads its box to commit the hand-off: the chosen tab's classes at that moment.
				if (this.dataset.slot === 'tabs-list') {
					surfaceAtCommit.push(
						(this.querySelector('[data-state="active"]') as HTMLElement).className
					);
				}
				return boxOf(this)?.[2] ?? 0;
			});
			vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(48);
		}
		const pillOf = () => document.querySelector('[data-slot="tabs-pill"]') as HTMLElement;

		afterEach(() => {
			vi.restoreAllMocks();
			surfaceAtCommit.length = 0;
		});

		it('U-12.4: ONE pill (`bg-card` + `shadow-raised` + `rounded-sm`) under the chosen tab; the same node slides to the tab pressed, 180 ms', async () => {
			layOut('horizontal');
			const user = userEvent.setup();
			render(Harness, { props: { value: 'account' } });
			const pill = pillOf();
			expect(document.querySelectorAll('[data-slot="tabs-pill"]')).toHaveLength(1);
			expect(pill).not.toHaveAttribute('hidden');
			expect(pill).toHaveAttribute('aria-hidden', 'true');
			for (const name of [
				'absolute',
				'pointer-events-none',
				'rounded-sm',
				'bg-card',
				'shadow-raised',
				'transition-[transform,width,height]',
				'duration-segment',
				'ease-segment'
			]) {
				expect(pill).toHaveClass(name);
			}
			expect(pill.style.transform).toBe('translate(4px, 4px)');
			expect(pill.style.width).toBe('100px');
			expect(pill.style.height).toBe('48px');
			// The pill draws the surface now: no tab draws its own (R2 drew one per tab, so nothing could slide).
			for (const tab of screen.getAllByRole('tab')) {
				expect(tab.className).not.toMatch(/bg-card|shadow-raised/);
				expect(tab).toHaveClass('relative', 'transition-[color,box-shadow]');
			}
			await user.click(screen.getByRole('tab', { name: 'Password' }));
			expect(pillOf()).toBe(pill);
			expect(pill.style.transform).toBe('translate(104px, 4px)');
			expect(pill.style.width).toBe('120px');
			// The keyboard moves it too (automatic activation).
			screen.getByRole('tab', { name: 'Password' }).focus();
			await user.keyboard('{ArrowLeft}');
			expect(pillOf()).toBe(pill);
			expect(pill.style.transform).toBe('translate(4px, 4px)');
		});

		it('U-12.4: until it is measured (the server’s draw) the chosen tab keeps its own surface; then the pill takes over in place', () => {
			layOut('horizontal');
			const target = document.body.appendChild(document.createElement('div'));
			const app = mount(Harness, { target, props: { value: 'account' } });
			// Before any effect runs (the markup as the server sends it): no pill, the tab's own surface.
			expect(pillOf()).toHaveAttribute('hidden');
			const account = target.querySelector('[data-value="account"]') as HTMLElement;
			expect(account).toHaveClass(
				'data-[state=active]:bg-card',
				'data-[state=active]:shadow-raised'
			);
			flushSync();
			expect(pillOf()).not.toHaveAttribute('hidden');
			expect(account.className).not.toMatch(/bg-card|shadow-raised/);
			// At the hand-off's commit the tab had dropped its surface and its shadow's transition (no double
			// shadow fading out under the pill); its ring's transition is back right after.
			expect(surfaceAtCommit).toHaveLength(1);
			expect(surfaceAtCommit[0]).toMatch(/(^|\s)transition-\[color\](\s|$)/);
			expect(surfaceAtCommit[0]).not.toMatch(/bg-card|shadow-raised/);
			expect(account).toHaveClass('transition-[color,box-shadow]');
			unmount(app);
			target.remove();
		});

		// Review r1, NIT-1: R3 read a hidden list's 0 × 0 box as a place, drew the pill there and slid it from the
		// corner when the list showed.
		it('U-12.4: a tab with no box (a hidden parent) is not measured — it keeps its own surface; the pill appears in place', () => {
			let shown = false;
			const box = { left: 4, top: 4, width: 100 };
			vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
				this: HTMLElement
			) {
				return shown && this.dataset.slot === 'tabs-trigger' ? box.left : 0;
			});
			vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
				this: HTMLElement
			) {
				return shown && this.dataset.slot === 'tabs-trigger' ? box.top : 0;
			});
			vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
				this: HTMLElement
			) {
				return shown && this.dataset.slot === 'tabs-trigger' ? box.width : 0;
			});
			vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
				this: HTMLElement
			) {
				return shown && this.dataset.slot === 'tabs-trigger' ? 48 : 0;
			});
			const resized: (() => void)[] = [];
			vi.stubGlobal(
				'ResizeObserver',
				class {
					constructor(callback: () => void) {
						resized.push(callback);
					}
					observe() {}
					unobserve() {}
					disconnect() {}
				}
			);
			onTestFinished(() => {
				vi.unstubAllGlobals();
			});
			render(Harness, { props: { value: 'account' } });
			const account = screen.getByRole('tab', { name: 'Account' });
			expect(pillOf()).toHaveAttribute('hidden');
			expect(pillOf().getAttribute('style')).toBeNull();
			expect(account).toHaveClass(
				'data-[state=active]:bg-card',
				'data-[state=active]:shadow-raised'
			);

			// The list shows: its observer measures, the pill comes out of `hidden` already on the tab.
			shown = true;
			for (const callback of resized) callback();
			flushSync();
			expect(pillOf()).not.toHaveAttribute('hidden');
			expect(pillOf().style.transform).toBe('translate(4px, 4px)');
			expect(pillOf().style.width).toBe('100px');
			expect(account.className).not.toMatch(/bg-card|shadow-raised/);
		});

		it('U-12.4: vertical tabs are a column (as the application’s) and the pill goes down to the tab pressed', async () => {
			layOut('vertical');
			const user = userEvent.setup();
			render(Harness, { props: { value: 'account', orientation: 'vertical' } });
			const list = screen.getByRole('tablist');
			expect(list).toHaveAttribute('data-orientation', 'vertical');
			expect(list).toHaveClass('data-[orientation=vertical]:flex-col');
			const pill = pillOf();
			expect(pill.style.transform).toBe('translate(4px, 4px)');
			await user.click(screen.getByRole('tab', { name: 'Password' }));
			expect(pillOf()).toBe(pill);
			expect(pill.style.transform).toBe('translate(4px, 52px)');
		});

		// 🔴 Owner 28/10: in a column the short tab drew its selection as wide as its word, not as the list.
		it('U-13.1: a vertical list stretches every tab to its full width; a horizontal one keeps its classes', () => {
			const vertical = render(Harness, { props: { value: 'account', orientation: 'vertical' } });
			expect(screen.getByRole('tablist')).toHaveClass(
				'data-[orientation=vertical]:items-stretch',
				'items-center'
			);
			vertical.unmount();
			render(Harness, { props: { value: 'account' } });
			const list = screen.getByRole('tablist');
			expect(list).toHaveAttribute('data-orientation', 'horizontal');
			expect(list.className).toBe(
				'relative inline-flex w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch'
			);
		});
	});
});
