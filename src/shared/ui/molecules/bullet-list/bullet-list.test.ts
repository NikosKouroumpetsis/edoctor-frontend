import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BulletList from './bullet-list.svelte';

describe('BulletList («Τι θα γίνει» under a reason; shared since D-W51-50)', () => {
	it('one list item per line, muted 13 with its dot, in order', () => {
		render(BulletList, {
			props: {
				items: ['Ο ασθενής ενημερώνεται αμέσως.', 'Η ώρα ελευθερώνεται.', 'Δεν αναιρείται.'],
				testId: 'then'
			}
		});
		const list = screen.getByTestId('then');
		expect(list.tagName).toBe('UL');
		expect(list).toHaveAttribute('data-slot', 'bullet-list');
		expect(list.className).toContain('list-disc');
		expect(list.className).toContain('text-muted-foreground');
		expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
			'Ο ασθενής ενημερώνεται αμέσως.',
			'Η ώρα ελευθερώνεται.',
			'Δεν αναιρείται.'
		]);
	});

	it('(negative) nothing at all without a line; a line is text, never HTML (U-65.6)', () => {
		const { unmount } = render(BulletList, { props: { items: [] } });
		expect(document.querySelector('ul')).toBeNull();
		unmount();
		render(BulletList, { props: { items: ['<b>x</b>'] } });
		expect(document.querySelector('b')).toBeNull();
	});
});
