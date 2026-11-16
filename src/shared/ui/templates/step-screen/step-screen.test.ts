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

	it('(negative, U-65.6 · U-100) the title is text, never HTML; no colour under the pointer', () => {
		render(Harness, { props: { ...base, title: '<b>x</b>' } });
		expect(screen.getByRole('heading').querySelector('b')).toBeNull();
		expect(screen.getByTestId('save').className).not.toMatch(/(?:^|\s)hover:/u);
	});
});
