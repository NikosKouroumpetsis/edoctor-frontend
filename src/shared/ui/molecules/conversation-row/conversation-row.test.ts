import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { ConversationRow } from '.';

const base = { href: '/messages/1', title: 'Dr. Α', initial: 'Α', testId: 'row' };

describe('ConversationRow (U-84 Π1)', () => {
	it('a link with who, what and when; the prefix before a message of the reader’s own', () => {
		render(ConversationRow, {
			props: {
				...base,
				subtitle: 'Παθολόγος',
				preview: 'Γεια',
				previewPrefix: 'Εσείς: ',
				time: 'Χθες'
			}
		});
		const row = screen.getByRole('link');
		expect(row).toHaveAttribute('href', '/messages/1');
		expect(row).toHaveTextContent('Dr. Α');
		expect(row).toHaveTextContent('Παθολόγος');
		expect(row).toHaveTextContent('Εσείς: Γεια');
		expect(row).toHaveTextContent('Χθες');
		expect(row).not.toHaveAttribute('data-unread');
		expect(row.querySelector('[data-slot="conversation-row-dot"]')).toBeNull();
	});

	it('unread: the dot, and the row says so', () => {
		render(ConversationRow, { props: { ...base, preview: 'Γεια', unread: true } });
		const row = screen.getByTestId('row');
		expect(row).toHaveAttribute('data-unread', 'true');
		expect(row.querySelector('[data-slot="conversation-row-dot"]')).not.toBeNull();
	});

	it('Σ1: the words’ column is `minmax(0, 1fr)`: an implicit column grows with a line that will not wrap, and `truncate` never cuts', () => {
		render(ConversationRow, { props: { ...base, preview: 'Γεια', unread: true } });
		const preview = screen
			.getByTestId('row')
			.querySelector('[data-slot="conversation-row-preview"]');
		const column = preview?.parentElement?.parentElement as HTMLElement;
		expect(column).toHaveClass('grid', 'grid-cols-1', 'min-w-0', 'flex-1');
		expect(preview).toHaveClass('truncate', 'min-w-0');
	});

	it('the chosen row is the current one', () => {
		render(ConversationRow, { props: { ...base, selected: true } });
		expect(screen.getByTestId('row')).toHaveAttribute('aria-current', 'page');
	});

	it('🔴 U-65.6, U-84.2 (negative): what a person wrote is text: no element, no link', () => {
		const preview = '<img src=x onerror=alert(1)><b>x</b> https://evil.example/login';
		render(ConversationRow, { props: { ...base, preview } });
		const slot = screen.getByTestId('row').querySelector('[data-slot="conversation-row-preview"]');
		expect(slot?.textContent).toBe(preview);
		expect(slot?.querySelector('img, b, a, script')).toBeNull();
		expect(screen.getAllByRole('link')).toHaveLength(1);
	});

	it('🔴 U-81.2: below 744 the application’s row: in the middle, 12, no sides, the dot on the line of the message', () => {
		render(ConversationRow, { props: { ...base, preview: 'Γεια', unread: true } });
		const row = screen.getByTestId('row');
		expect(row).toHaveClass(
			'items-center',
			'py-3',
			'tablet:items-start',
			'tablet:px-2',
			'tablet:py-3.5'
		);
		expect(row).not.toHaveClass('px-2');
		expect(screen.getByText('Dr. Α')).toHaveClass('text-body-lg', 'tablet:text-bubble');
		const preview = row.querySelector('[data-slot="conversation-row-preview"]') as HTMLElement;
		expect(preview).toHaveClass('text-body-md', 'tablet:text-row-line');
		const dot = row.querySelector('[data-slot="conversation-row-dot"]') as HTMLElement;
		expect(dot.parentElement).toBe(preview.parentElement);
		expect(dot).not.toHaveClass('absolute');
		expect(dot).toHaveClass('tablet:absolute');
	});
});
