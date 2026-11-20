import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './step-screen.harness.svelte';

const base = {
	title: 'Απόρριψη αιτήματος',
	backHref: '/back',
	onBack: vi.fn(),
	backLabel: 'Πίσω',
	saveLabel: 'Απόρριψη αιτήματος',
	cancelLabel: 'Να μείνει',
	onCancel: vi.fn(),
	onSave: vi.fn(),
	backTestId: 'back',
	cancelTestId: 'keep',
	saveTestId: 'save',
	testId: 'frame'
};
const frame = () => screen.getByTestId('frame');
const column = () => frame().firstElementChild as HTMLElement;
const bar = () => frame().querySelector('[data-slot="step-screen-bar"]') as HTMLElement;
/** None of `classes` (jest-dom's negated `toHaveClass` passes when only ONE of several is missing). */
const lacks = (node: Element, ...classes: string[]) => {
	for (const name of classes) expect(node, name).not.toHaveClass(name);
};

describe('StepScreen (U-102: a step is a screen of its own, never a modal; shared since D-W51-50)', () => {
	it('«←», the title, the content, then «Άκυρο» and the action — the caller’s words and test ids; no dialog', async () => {
		const onBack = vi.fn((event: MouseEvent) => event.preventDefault());
		const onCancel = vi.fn();
		const onSave = vi.fn();
		render(Harness, { props: { ...base, onBack, onCancel, onSave, placement: 'pane' } });
		expect(frame()).toHaveAttribute('data-slot', 'step-screen');
		expect(frame().tagName).toBe('SECTION');
		expect(document.querySelector('[role="dialog"], [aria-modal]')).toBeNull();
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Απόρριψη αιτήματος');
		expect(screen.getByTestId('content')).toHaveTextContent('Το περιεχόμενο');
		const back = screen.getByRole('link', { name: 'Πίσω' });
		expect(back).toBe(screen.getByTestId('back'));
		expect(back).toHaveAttribute('href', '/back');
		await fireEvent.click(back);
		expect(onBack).toHaveBeenCalledTimes(1);
		await fireEvent.click(screen.getByTestId('keep'));
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('keep')).toHaveTextContent('Να μείνει');
		await fireEvent.click(screen.getByTestId('save'));
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	it('the bar is pinned to the bottom below 744 and in the flow from it; the action locked or busy as the caller says', async () => {
		const onSave = vi.fn();
		const view = render(Harness, { props: { ...base, onSave, saveDisabled: true } });
		expect(bar()).toHaveClass('fixed', 'inset-x-0', 'bottom-0', 'tablet:static');
		const save = screen.getByTestId('save');
		expect(save).toBeDisabled();
		await userEvent.setup().click(save);
		expect(onSave).not.toHaveBeenCalled();
		await view.rerender({ ...base, onSave, saveLoading: true });
		expect(screen.getByTestId('save')).toHaveAttribute('aria-busy', 'true');
	});

	it('`cancelLabel: null` leaves the action alone at the bar’s end; `bar: false` draws none; a footer comes after it', () => {
		const one = render(Harness, { props: { ...base, cancelLabel: null, withFooter: true } });
		expect(screen.queryByTestId('keep')).toBeNull();
		expect(screen.getByTestId('save')).toHaveTextContent('Απόρριψη αιτήματος');
		const footer = screen.getByTestId('footer');
		expect(bar().compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		one.unmount();
		render(Harness, { props: { ...base, bar: false } });
		expect(bar()).toBeNull();
	});

	it('`page` is the page: a `<main>`, an `h1` and the tab’s title the caller composed', () => {
		render(Harness, { props: { ...base, placement: 'page', pageTitle: 'Αλλαγή | Τίτλος' } });
		expect(frame().tagName).toBe('MAIN');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Απόρριψη αιτήματος');
		expect(document.title).toBe('Αλλαγή | Τίτλος');
		expect(frame()).toHaveClass('min-h-dvh', 'tablet:min-h-page');
	});

	it('D-W51-72: `backHref: null` is a page with nothing behind it — no «←» at all, the title and the action stay', () => {
		render(Harness, { props: { ...base, backHref: null, placement: 'page', cancelLabel: null } });
		expect(screen.queryByTestId('back')).toBeNull();
		expect(frame().querySelector('[data-slot="round-link"]')).toBeNull();
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Απόρριψη αιτήματος');
		expect(screen.getByTestId('save')).toBeInTheDocument();
	});

	it('🔴 U-167: `pane` is the 50 split’s right column — centred from 950 at its widths, never pushed against the list', () => {
		render(Harness, { props: { ...base, placement: 'pane' } });
		expect(frame()).toHaveClass(
			'mx-auto',
			'tablet:max-w-pane-column',
			'split:max-w-split-sub',
			'split:px-pane-inset',
			'laptop:max-w-split-sub-lg',
			'laptop:px-pane-inset-lg',
			'desktop:max-w-split-sub-xl'
		);
		expect(column()).toHaveClass('tablet:max-w-form');
	});

	it('🔴 D-W51-46 · U-167: `centred` stands alone 744–1127 (560 in the middle) and from 1128 takes the split’s centre whole (640), «‹» there too', () => {
		render(Harness, { props: { ...base, placement: 'centred', backIcon: 'chevron-back' } });
		expect(frame()).toHaveAttribute('data-placement', 'centred');
		expect(frame()).toHaveClass(
			'mx-auto',
			'pb-page-bar',
			'tablet:max-w-pane-column',
			'tablet:px-reading-gap',
			'laptop:max-w-none',
			'laptop:px-0',
			'laptop:pt-0',
			'laptop:pb-0'
		);
		lacks(frame(), 'split:max-w-split-sub', 'split:px-pane-inset', 'laptop:px-pane-inset-lg');
		expect(column()).toHaveClass('tablet:max-w-form', 'laptop:max-w-none');
		const backBox = screen.getByTestId('back').parentElement as HTMLElement;
		lacks(backBox, 'split:hidden', 'laptop:hidden', 'split:absolute');
	});

	it('🔴 D-W52-40 · U-167 · U-217: `menu` stands alone below 950 and from 950 takes the centre of a menu’s right column whole — the section’s smaller title, and no «‹» beside the menu', () => {
		render(Harness, {
			props: { ...base, placement: 'menu', backIcon: 'chevron-back', besideList: true }
		});
		expect(frame()).toHaveAttribute('data-placement', 'menu');
		expect(frame().tagName).toBe('SECTION');
		expect(frame()).toHaveClass(
			'mx-auto',
			'pb-page-bar',
			'tablet:max-w-pane-column',
			'tablet:px-reading-gap',
			'split:max-w-none',
			'split:px-0',
			'split:pt-0',
			'split:pb-0'
		);
		lacks(frame(), 'laptop:max-w-none', 'split:max-w-split-sub', 'split:px-pane-inset');
		expect(column()).toHaveClass('tablet:max-w-form', 'split:max-w-none');
		expect(screen.getByRole('heading', { level: 2 })).toHaveClass(
			'text-heading-lg',
			'split:text-heading-md'
		);
		expect(screen.getByTestId('back').parentElement).toHaveClass('split:hidden');
	});

	it('D-W52-40: the subtitle may carry an id, so a control of the content names it as what describes it; none by default', () => {
		const first = render(Harness, {
			props: { ...base, subtitle: 'Σύρετε για να διαλέξετε τι φαίνεται.', subtitleId: 'what' }
		});
		expect(document.getElementById('what')).toHaveTextContent(
			'Σύρετε για να διαλέξετε τι φαίνεται.'
		);
		first.unmount();
		render(Harness, { props: { ...base, subtitle: 'Σύρετε.' } });
		expect(screen.getByText('Σύρετε.')).not.toHaveAttribute('id');
	});

	it('🔴 D-W52-59α: `barNote` is a line ALWAYS in sight — in the bar, over «Άκυρο / action», announced when its words come (`aria-live`); while it has words the bar holds the bottom of the screen from 744 too and the content ends a line higher below it; text alone, the kit’s muted line', async () => {
		const view = render(Harness, { props: { ...base, barNote: '', barNoteTestId: 'note' } });
		const note = screen.getByTestId('note');
		// The place is ready and empty: nothing is drawn, and the bar is where it always was.
		expect(note).toHaveAttribute('aria-live', 'polite');
		expect(note).toBeEmptyDOMElement();
		expect(bar()).toContainElement(note);
		expect(bar()).toHaveClass('fixed', 'bottom-0', 'tablet:static');
		expect(bar()).not.toHaveClass('tablet:sticky');
		expect(bar()).not.toHaveAttribute('data-noted');
		expect(document.querySelector('[data-slot="step-screen-note-room"]')).toBeNull();

		await view.rerender({ ...base, barNote: 'Διαλέξατε 3. <b>x</b>', barNoteTestId: 'note' });
		// The SAME place took the words (a reader of the screen hears them), as text.
		expect(screen.getByTestId('note')).toBe(note);
		expect(note.textContent?.trim()).toBe('Διαλέξατε 3. <b>x</b>');
		expect(note.querySelector('b')).toBeNull();
		const line = note.querySelector('p') as HTMLElement;
		expect(line).toHaveClass('text-body-sm', 'text-muted-foreground');
		expect(line.className).not.toMatch(/hover:|animate-|bg-/u);
		// Over the buttons, inside the bar.
		const cancel = screen.getByTestId('keep');
		expect(note.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(bar()).toContainElement(cancel);
		// Pinned below 744 as ever; from 744 it now holds the bottom of the screen.
		expect(bar()).toHaveClass('fixed', 'bottom-0', 'tablet:sticky', 'tablet:bottom-0');
		expect(bar()).not.toHaveClass('tablet:static');
		expect(bar()).toHaveAttribute('data-noted');
		const room = document.querySelector('[data-slot="step-screen-note-room"]') as HTMLElement;
		expect(room).toHaveClass('tablet:hidden');
		expect(room).toHaveAttribute('aria-hidden', 'true');
		expect(room.compareDocumentPosition(bar()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		view.unmount();

		// (negative) left out, the bar has no such place at all; and no bar, no line.
		const plain = render(Harness, { props: { ...base } });
		expect(document.querySelector('[data-slot="step-screen-bar-note"]')).toBeNull();
		plain.unmount();
		render(Harness, { props: { ...base, bar: false, barNote: 'Διαλέξατε 3.' } });
		expect(document.querySelector('[data-slot="step-screen-bar-note"]')).toBeNull();
		expect(document.querySelector('[data-slot="step-screen-note-room"]')).toBeNull();
	});

	it('(negative, U-65.6 · U-100) the title is text, never HTML; no colour under the pointer', () => {
		render(Harness, { props: { ...base, title: '<b>x</b>' } });
		expect(screen.getByRole('heading').querySelector('b')).toBeNull();
		expect(screen.getByTestId('save').className).not.toMatch(/(?:^|\s)hover:/u);
	});
});
