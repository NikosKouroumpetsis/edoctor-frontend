import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { __getLockCount } from '$shared/lib/headless';
import InfoDialog from './info-dialog.svelte';
import Harness from './info-dialog.harness.svelte';

async function openSecond() {
	const utils = render(Harness);
	await tick();
	const opener = screen.getByTestId('opener');
	opener.focus();
	await fireEvent.click(opener);
	await tick();
	return { ...utils, opener };
}

describe('InfoDialog · a window over a window (U-67.3)', () => {
	it('from 744 the small window: the focus goes into it, stays in it, and leaves the first window behind', async () => {
		await openSecond();
		const second = await screen.findByTestId('second');
		expect(second).toHaveAttribute('role', 'dialog');
		expect(second).toHaveAttribute('aria-modal', 'true');
		expect(document.activeElement).toBe(second);
		// Tab from the last focusable (the link) goes round to the «×», never into the first window.
		const help = screen.getByTestId('help');
		help.focus();
		await fireEvent.keyDown(help, { key: 'Tab' });
		expect(document.activeElement).toBe(screen.getByTestId('second-close'));
		await fireEvent.keyDown(screen.getByTestId('second-close'), { key: 'Tab', shiftKey: true });
		expect(document.activeElement).toBe(help);
	});

	it('Escape closes ONLY the top one, and the focus goes back to the link that opened it', async () => {
		const onFirstDismiss = vi.fn();
		render(Harness, { props: { onFirstDismiss } });
		await tick();
		const opener = screen.getByTestId('opener');
		opener.focus();
		await fireEvent.click(opener);
		await tick();
		const second = await screen.findByTestId('second');
		await fireEvent.keyDown(second, { key: 'Escape' });
		await waitFor(() => expect(screen.queryByTestId('second')).toBeNull(), { timeout: 2000 });
		expect(onFirstDismiss).not.toHaveBeenCalled();
		expect(screen.getByTestId('first')).toBeInTheDocument();
		expect(document.activeElement).toBe(opener);
	});

	it('the scroll lock holds until the LAST window closes', async () => {
		const before = __getLockCount();
		const { unmount } = render(Harness);
		await tick();
		expect(__getLockCount()).toBe(before + 1);
		await fireEvent.click(screen.getByTestId('opener'));
		await tick();
		const second = await screen.findByTestId('second');
		expect(__getLockCount()).toBe(before + 2);
		expect(document.body.style.overflow).toBe('hidden');
		await fireEvent.click(screen.getByTestId('second-close'));
		await waitFor(() => expect(screen.queryByTestId('second')).toBeNull(), { timeout: 2000 });
		expect(second.isConnected).toBe(false);
		expect(__getLockCount()).toBe(before + 1);
		expect(document.body.style.overflow).toBe('hidden');
		unmount();
		expect(__getLockCount()).toBe(before);
	});

	it('U-67.1 Π2: one element for both shapes: the sheet’s handle shows only below 744 (CSS), and a long drag down closes it', async () => {
		await openSecond();
		const second = await screen.findByTestId('second');
		expect(second).toHaveClass('max-tablet:top-auto', 'max-tablet:h-fit');
		const handle = second.querySelector('[data-slot="info-dialog-handle"]') as HTMLElement;
		expect(handle).toHaveClass('tablet:hidden');
		// jsdom lays nothing out: the handle reads as shown.
		handle.getClientRects = () => [new DOMRect(0, 0, 36, 4)] as unknown as DOMRectList;
		const bar = second.querySelector('[data-slot="info-dialog-bar"]') as HTMLElement;
		await fireEvent.pointerDown(bar, { clientY: 100 });
		await fireEvent.pointerMove(bar, { clientY: 120 });
		await tick();
		expect(second.getAttribute('style')).toContain('translateY(20px)');
		await fireEvent.pointerMove(bar, { clientY: 300 });
		await fireEvent.pointerUp(bar, { clientY: 300 });
		await waitFor(() => expect(screen.queryByTestId('second')).toBeNull(), { timeout: 2000 });
	});

	it('(negative) a press on the «×» is no drag, and from 744 (no handle laid out) nothing drags', async () => {
		await openSecond();
		const second = await screen.findByTestId('second');
		const handle = second.querySelector('[data-slot="info-dialog-handle"]') as HTMLElement;
		handle.getClientRects = () => [] as unknown as DOMRectList;
		const bar = second.querySelector('[data-slot="info-dialog-bar"]') as HTMLElement;
		await fireEvent.pointerDown(bar, { clientY: 100 });
		await tick();
		expect(second).not.toHaveAttribute('data-dragging');
		handle.getClientRects = () => [new DOMRect(0, 0, 36, 4)] as unknown as DOMRectList;
		await fireEvent.pointerDown(screen.getByTestId('second-close'), { clientY: 100 });
		await tick();
		expect(second).not.toHaveAttribute('data-dragging');
	});

	it('U-65.6 (negative): its words are words, never markup', async () => {
		await openSecond();
		const second = await screen.findByTestId('second');
		expect(second.textContent).toContain('<b>Κείμενο</b>');
		expect(second.querySelector('b')).toBeNull();
	});

	it('U-75 Π3: rows with a glyph under a heading, a muted intro with its bold words, a `tel:` to press', async () => {
		render(InfoDialog, {
			props: {
				open: true,
				title: 'Πολιτική ακύρωσης',
				closeLabel: 'Κλείσιμο',
				testId: 'page',
				intro: [{ text: 'Ισχύει για το ' }, { text: 'Νίκης 12', emphasis: true }],
				blocks: [
					{
						heading: 'Ακύρωση',
						intro: 'Ένας γενικός οδηγός.',
						rows: [
							{
								key: 'a',
								icon: 'call-outline',
								label: 'Μετά το όριο',
								sub: 'Επικοινωνήστε:',
								link: { label: '210 1234567', href: 'tel:2101234567' }
							},
							{ key: 'b', icon: 'mail-outline', label: '<i>Χωρίς γραμμή</i>' }
						]
					}
				]
			}
		});
		const page = await screen.findByTestId('page');
		expect(page.querySelector('[data-slot="info-dialog-intro"]')).toHaveTextContent(
			'Ισχύει για το Νίκης 12'
		);
		expect(page.querySelector('[data-slot="info-dialog-intro"] .font-semibold')).toHaveTextContent(
			'Νίκης 12'
		);
		expect(screen.getByRole('heading', { level: 3, name: 'Ακύρωση' })).toBeInTheDocument();
		expect(screen.getByText('Ένας γενικός οδηγός.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '210 1234567' })).toHaveAttribute(
			'href',
			'tel:2101234567'
		);
		expect(screen.getByTestId('page-row-b').querySelector('i')).toBeNull();
		expect(screen.getByTestId('page-row-b')).toHaveTextContent('<i>Χωρίς γραμμή</i>');
	});
});
