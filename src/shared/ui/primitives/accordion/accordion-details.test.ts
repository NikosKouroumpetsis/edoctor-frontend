import { describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { AccordionDetails } from './index';
import { openInPage } from './accordion-details.svelte';

const answer = createRawSnippet(() => ({ render: () => '<p>Η απάντηση.</p>' }));

const renderDetails = (props: Record<string, unknown> = {}) =>
	render(AccordionDetails, {
		props: { summary: 'Πώς ακυρώνω;', summaryAs: 'h3', children: answer, ...props }
	});

const item = (container: HTMLElement) =>
	container.querySelector('[data-slot="accordion-item"]') as HTMLDetailsElement;
const content = (container: HTMLElement) =>
	container.querySelector('[data-slot="accordion-content"]') as HTMLElement;

describe('AccordionDetails (MINOR-5 of r1)', () => {
	it('U-60.1 (common v2 §F): a `<details>` whose answer is in the page from the server on, the summary a heading of the outline', () => {
		const { container } = renderDetails({ id: 'cancellation' });
		expect(item(container).tagName).toBe('DETAILS');
		expect(item(container)).toHaveAttribute('id', 'cancellation');
		expect(item(container).open).toBe(false);
		expect(screen.getByRole('heading', { level: 3, name: 'Πώς ακυρώνω;' })).toBeInTheDocument();
		expect(screen.getByText('Η απάντηση.')).toBeInTheDocument();
	});

	it('U-60.1 / U-12: a press opens it with the kit’s motion (`data-state`) and it STAYS open (a template update once closed it again), a second closes it; the caller hears both', async () => {
		const onToggle = vi.fn();
		const { container } = renderDetails({ onToggle });
		const summary = container.querySelector('summary') as HTMLElement;
		await fireEvent.click(summary);
		expect(item(container).open).toBe(true);
		expect(content(container)).toHaveAttribute('data-state', 'open');
		expect(onToggle).toHaveBeenLastCalledWith(true);
		await fireEvent.click(summary);
		expect(content(container)).toHaveAttribute('data-state', 'closed');
		expect(onToggle).toHaveBeenLastCalledWith(false);
		await vi.waitFor(() => expect(item(container).open).toBe(false));
		expect(content(container)).toHaveClass('duration-accordion', 'ease-accordion');
	});

	it('U-60.1: opened by the browser itself (find in page, an anchor), the motion follows; `open` opens it on the first render', async () => {
		const { container } = renderDetails();
		item(container).open = true;
		await fireEvent(item(container), new Event('toggle'));
		expect(content(container)).toHaveAttribute('data-state', 'open');
		const opened = renderDetails({ open: true });
		expect(item(opened.container).open).toBe(true);
	});

	it('U-60.1 Π4: the folded words of a search are bold in the summary; without them the words are plain', () => {
		const { container } = renderDetails({ highlight: ['ακυρωνω'] });
		expect(container.querySelector('mark')).toHaveTextContent('ακυρώνω');
		const plain = renderDetails();
		expect(plain.container.querySelector('mark')).toBeNull();
	});

	it('NIT-r2-3: a question the reader opened before the script ran stays open on hydration — the element’s own state wins', () => {
		const opened = document.createElement('details');
		opened.setAttribute('data-accordion-details', 'q1');
		opened.open = true;
		const closed = document.createElement('details');
		closed.setAttribute('data-accordion-details', 'q2');
		document.body.append(opened, closed);
		expect(openInPage('q1', false)).toBe(true);
		expect(openInPage('q2', true)).toBe(false);
		expect(openInPage('none', true)).toBe(true);
		opened.remove();
		closed.remove();
	});

	it('NIT-r2-3: each item names its element for the hydration (`data-accordion-details`)', () => {
		const { container } = renderDetails();
		expect(item(container).getAttribute('data-accordion-details')).toBeTruthy();
	});
});
