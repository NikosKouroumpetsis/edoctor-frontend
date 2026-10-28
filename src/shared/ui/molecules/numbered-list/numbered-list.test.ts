import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import NumberedList from './numbered-list.svelte';

const ITEMS = ['Πτυχίο Ιατρικής, ΕΚΠΑ', 'Ειδικότητα Παθολογίας', 'Μεταπτυχιακό στη Διαβητολογία'];

describe('NumberedList', () => {
	it('U-02.2 (K5.11): the title and its count, then «1.», «2.» … beside each item (M-29)', () => {
		render(NumberedList, {
			props: { title: 'Σπουδές', count: '(3)', items: ITEMS, testId: 'studies' }
		});
		expect(screen.getByTestId('studies')).toHaveClass('flex', 'flex-col', 'gap-4');
		expect(screen.getByText('Σπουδές (3)')).toHaveClass(
			'text-title-sm',
			'font-semibold',
			'text-foreground'
		);
		const list = screen.getByRole('list', { name: 'Σπουδές (3)' });
		expect(list.tagName).toBe('OL');
		expect(list).toHaveClass('flex', 'flex-col', 'gap-4');
		const rows = screen.getAllByRole('listitem');
		expect(rows).toHaveLength(3);
		expect(rows[1]).toHaveClass('flex', 'flex-row', 'items-start', 'gap-3');
		const number = rows[1].firstElementChild;
		expect(number).toHaveTextContent('2.');
		expect(number).toHaveAttribute('aria-hidden', 'true');
		expect(number).toHaveClass('text-body-lg', 'font-semibold', 'text-foreground');
		expect(screen.getByText(ITEMS[1])).toHaveClass('flex-1', 'text-body-sm', 'text-foreground/88');
	});

	it('U-02.2: an underlined link at the start under the list — a press or a page; none without its words', async () => {
		const user = userEvent.setup({ delay: null });
		const onLink = vi.fn();
		const view = render(NumberedList, {
			props: { title: 'Σπουδές', items: ITEMS, linkLabel: 'Εμφάνιση όλων', onLink }
		});
		const link = screen.getByRole('button', { name: 'Εμφάνιση όλων' });
		expect(link).toHaveClass('self-start', 'min-h-touch');
		expect(screen.getByText('Εμφάνιση όλων')).toHaveClass('underline');
		await user.click(link);
		expect(onLink).toHaveBeenCalledOnce();
		expect(screen.getByText('Σπουδές').textContent).toBe('Σπουδές');
		view.unmount();
		const page = render(NumberedList, {
			props: { title: 'Σπουδές', items: ITEMS, linkLabel: 'Όλες', linkHref: '/el/studies' }
		});
		expect(screen.getByRole('link', { name: 'Όλες' })).toHaveAttribute('href', '/el/studies');
		page.unmount();
		const { container } = render(NumberedList, { props: { title: 'Σπουδές', items: ITEMS } });
		expect(screen.queryByRole('button')).toBeNull();
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
