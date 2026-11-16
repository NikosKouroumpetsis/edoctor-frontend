import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ButtonStack from './button-stack.svelte';

describe('ButtonStack (D-W51-27)', () => {
	it('🔴 U-190.1: the answers one under the other at every width — one column, no width prefix — round, the whole width, 48 high', () => {
		render(ButtonStack, {
			props: {
				testId: 'stack',
				actions: [
					{ id: 'a', label: 'Απόρριψη', onPress: vi.fn() },
					{ id: 'b', label: 'Αλλαγή', onPress: vi.fn() },
					{ id: 'c', label: 'Επιβεβαίωση', emphasis: true, onPress: vi.fn() }
				]
			}
		});
		const stack = screen.getByTestId('stack');
		expect(stack.className).toContain('grid-cols-1');
		expect(stack.className).not.toMatch(/(?:^|\s)\S+:grid-cols-(?!1\b)/u);
		for (const button of screen.getAllByRole('button')) {
			expect(button.className).toContain('rounded-full');
			expect(button.className).toContain('w-full');
			expect(button.className).toContain('min-h-control-md');
		}
	});

	it('🔴 U-189.1: the dark one is drawn LAST whatever its place in the list; the outlined keep their order', () => {
		render(ButtonStack, {
			props: {
				actions: [
					{ id: 'c', label: 'Ολοκληρώθηκε', emphasis: true, onPress: vi.fn() },
					{ id: 'a', label: 'Δεν ήρθε', onPress: vi.fn() }
				]
			}
		});
		const buttons = screen.getAllByRole('button');
		expect(buttons.map((button) => button.textContent?.trim())).toEqual([
			'Δεν ήρθε',
			'Ολοκληρώθηκε'
		]);
		expect(buttons[0]).toHaveAttribute('data-tone', 'outline');
		expect(buttons[1]).toHaveAttribute('data-tone', 'contrast');
	});

	it('a press calls its own answer; a busy one refuses a second press and keeps its name', async () => {
		const user = userEvent.setup();
		const confirm = vi.fn();
		const view = render(ButtonStack, {
			props: { actions: [{ id: 'c', label: 'Επιβεβαίωση', emphasis: true, onPress: confirm }] }
		});
		await user.click(screen.getByRole('button', { name: 'Επιβεβαίωση' }));
		expect(confirm).toHaveBeenCalledTimes(1);
		await view.rerender({
			actions: [{ id: 'c', label: 'Επιβεβαίωση', emphasis: true, loading: true, onPress: confirm }]
		});
		const busy = screen.getByRole('button', { name: 'Επιβεβαίωση' });
		expect(busy).toBeDisabled();
		expect(busy).toHaveAttribute('aria-busy', 'true');
		await user.click(busy);
		expect(confirm).toHaveBeenCalledTimes(1);
	});

	it('D-W51-49: an answer that leads to another screen is a LINK in the same look — its press reaches the caller first; a busy stack locks it', async () => {
		const user = userEvent.setup();
		const open = vi.fn((event: MouseEvent) => event.preventDefault());
		const view = render(ButtonStack, {
			props: {
				actions: [
					{ id: 'reject', label: 'Απόρριψη', href: '/x/reject', onPress: open },
					{ id: 'confirm', label: 'Επιβεβαίωση', emphasis: true, onPress: vi.fn() }
				]
			}
		});
		const link = screen.getByRole('link', { name: 'Απόρριψη' });
		expect(link).toHaveAttribute('href', '/x/reject');
		expect(link).toHaveAttribute('data-tone', 'outline');
		expect(link.className).toContain('rounded-full');
		expect(link.className).toContain('w-full');
		await user.click(link);
		expect(open).toHaveBeenCalledTimes(1);
		await view.rerender({
			actions: [
				{ id: 'reject', label: 'Απόρριψη', href: '/x/reject', disabled: true },
				{ id: 'confirm', label: 'Επιβεβαίωση', emphasis: true, loading: true, onPress: vi.fn() }
			]
		});
		const locked = screen.getByText('Απόρριψη').closest('a') as HTMLAnchorElement;
		expect(locked).not.toHaveAttribute('href');
		expect(locked).toHaveAttribute('aria-disabled', 'true');
	});

	it('nothing to answer draws nothing; words with HTML stay words', () => {
		const empty = render(ButtonStack, { props: { actions: [], testId: 'none' } });
		expect(screen.queryByTestId('none')).toBeNull();
		empty.unmount();
		render(ButtonStack, {
			props: { actions: [{ id: 'x', label: '<b>Αλλαγή</b>', onPress: vi.fn() }] }
		});
		expect(screen.getByRole('button', { name: '<b>Αλλαγή</b>' }).querySelector('b')).toBeNull();
	});
});
