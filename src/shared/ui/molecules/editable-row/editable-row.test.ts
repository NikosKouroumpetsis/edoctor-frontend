import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './editable-row.harness.svelte';

const row = () => screen.getByTestId('row');
const other = () => screen.getByTestId('other');

describe('EditableRow (D-W45-09)', () => {
	it('closed: the title 15 / 600 over what it holds now (14 muted), the caller’s link 14 / 600 underlined on the right, a line under it, 20 over and under', () => {
		render(Harness, { props: { value: 'Η τιμή σήμερα' } });
		expect(row()).toHaveAttribute('data-state', 'closed');
		expect(row()).toHaveClass('border-b', 'border-line', 'pt-5', 'pb-5');
		const title = within(row()).getByRole('heading', { level: 2, name: 'Τίτλος' });
		expect(title).toHaveClass('text-body-md', 'font-semibold', 'text-foreground');
		const value = row().querySelector('[data-slot="editable-row-value"]');
		expect(value).toHaveTextContent('Η τιμή σήμερα');
		expect(value).toHaveClass('text-body-sm', 'text-muted-foreground');
		const action = within(row()).getByRole('button', { name: 'Αλλαγή' });
		expect(action).toHaveAttribute('aria-expanded', 'false');
		expect(action).toHaveAccessibleDescription('Τίτλος');
		expect(action.querySelector('span')).toHaveClass('text-body-sm', 'font-semibold', 'underline');
		// The row is a group named by its title; its content is not in the page while closed.
		expect(screen.getByRole('group', { name: 'Τίτλος' })).toBe(row());
		expect(within(row()).queryByRole('textbox')).toBeNull();
		expect(row().className).not.toMatch(/\[#|rgb|hover:(bg|text)-/u);
	});

	it('without a value the title stands alone (no empty line under it)', () => {
		render(Harness);
		expect(row().querySelector('[data-slot="editable-row-value"]')).toBeNull();
		expect(within(row()).getByRole('heading', { name: 'Τίτλος' })).toBeInTheDocument();
	});

	it('the link opens the row in its place: the title, the caller’s closing link on the right, the help and the content — and the focus goes to the first thing in it', async () => {
		const onOpenChange = vi.fn();
		render(Harness, { props: { value: 'Η τιμή σήμερα', help: 'Τι αλλάζει.', onOpenChange } });
		await userEvent.setup().click(within(row()).getByRole('button', { name: 'Αλλαγή' }));
		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
		expect(row()).toHaveAttribute('data-state', 'open');
		expect(row()).toHaveClass('pt-5', 'pb-6');
		// What it held is not repeated while it is edited; the action's link gave its place to the closing one.
		expect(row().querySelector('[data-slot="editable-row-value"]')).toBeNull();
		expect(within(row()).queryByRole('button', { name: 'Αλλαγή' })).toBeNull();
		const close = within(row()).getByRole('button', { name: 'Κλείσιμο' });
		expect(close).toHaveAttribute('aria-expanded', 'true');
		const body = row().querySelector('[data-slot="editable-row-body"]') as HTMLElement;
		expect(close).toHaveAttribute('aria-controls', body.id);
		expect(row()).toHaveAccessibleDescription('Τι αλλάζει.');
		expect(row().querySelector('[data-slot="editable-row-help"]')).toHaveClass(
			'text-body-sm',
			'text-muted-foreground'
		);
		const field = within(row()).getByRole('textbox', { name: 'Πεδίο' });
		await waitFor(() => expect(field).toHaveFocus());
	});

	it('🔴 U-12: the content comes in with a move that always shows — CSS alone (`starting:` on a motion token), no reader of the device’s motion setting', () => {
		render(Harness, { props: { open: true } });
		const body = row().querySelector('[data-slot="editable-row-body"]') as HTMLElement;
		expect(body).toHaveClass(
			'transition-[opacity,translate]',
			'duration-standard',
			'ease-standard',
			'starting:opacity-0',
			'starting:-translate-y-1'
		);
		expect(body.className).not.toMatch(/motion-(reduce|safe)/u);
		expect(row()).toHaveClass('transition-opacity', 'duration-standard');
	});

	it('the closing link closes it with no change, and the focus goes back to the link that opened it', async () => {
		const onOpenChange = vi.fn();
		render(Harness, { props: { value: 'Η τιμή σήμερα', onOpenChange } });
		const user = userEvent.setup();
		await user.click(within(row()).getByRole('button', { name: 'Αλλαγή' }));
		await user.click(within(row()).getByRole('button', { name: 'Κλείσιμο' }));
		expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
		expect(row()).toHaveAttribute('data-state', 'closed');
		expect(row().querySelector('[data-slot="editable-row-value"]')).toHaveTextContent(
			'Η τιμή σήμερα'
		);
		await waitFor(() =>
			expect(within(row()).getByRole('button', { name: 'Αλλαγή' })).toHaveFocus()
		);
	});

	it('Escape closes it from anywhere inside, and the focus goes back to its link; Escape on a closed row does nothing', async () => {
		const onOpenChange = vi.fn();
		render(Harness, { props: { onOpenChange } });
		const user = userEvent.setup();
		const action = within(row()).getByRole('button', { name: 'Αλλαγή' });
		action.focus();
		await user.keyboard('{Escape}');
		expect(onOpenChange).not.toHaveBeenCalled();
		await user.click(action);
		await user.type(within(row()).getByRole('textbox'), 'κάτι{Escape}');
		expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
		expect(row()).toHaveAttribute('data-state', 'closed');
		await waitFor(() =>
			expect(within(row()).getByRole('button', { name: 'Αλλαγή' })).toHaveFocus()
		);
	});

	it('a caller that closes it after a choice gets the same: closed, the focus on its link', async () => {
		let handle: { close: () => void } | undefined;
		render(Harness, { props: { onReady: (next: { close: () => void }) => (handle = next) } });
		await userEvent.setup().click(within(row()).getByRole('button', { name: 'Αλλαγή' }));
		handle?.close();
		await waitFor(() => expect(row()).toHaveAttribute('data-state', 'closed'));
		await waitFor(() =>
			expect(within(row()).getByRole('button', { name: 'Αλλαγή' })).toHaveFocus()
		);
	});

	it('`dimmed`: while another row is open this one fades, takes no press and says so (`aria-disabled`); it comes back when the other closes', async () => {
		render(Harness, { props: { value: 'Η τιμή σήμερα' } });
		const user = userEvent.setup();
		expect(other()).not.toHaveAttribute('data-dimmed');
		expect(other()).not.toHaveClass('opacity-35');
		await user.click(within(row()).getByRole('button', { name: 'Αλλαγή' }));
		expect(other()).toHaveAttribute('data-dimmed');
		expect(other()).toHaveClass('pointer-events-none', 'opacity-35');
		const sleeping = within(other()).getByRole('button', { name: 'Αλλαγή' });
		expect(sleeping).toHaveAttribute('aria-disabled', 'true');
		expect(sleeping).toHaveAttribute('tabindex', '-1');
		// The open row itself is whole.
		expect(row()).not.toHaveClass('opacity-35');
		await user.click(within(row()).getByRole('button', { name: 'Κλείσιμο' }));
		expect(other()).not.toHaveAttribute('data-dimmed');
		expect(within(other()).getByRole('button', { name: 'Αλλαγή' })).not.toHaveAttribute(
			'aria-disabled'
		);
	});

	it('(negative) a dimmed row does not open — by the keyboard or by a press that reaches its link all the same', async () => {
		const onOpenChange = vi.fn();
		render(Harness, { props: { dimmed: true, onOpenChange } });
		const action = within(row()).getByRole('button', { name: 'Αλλαγή' });
		action.click();
		action.focus();
		await userEvent.setup().keyboard('{Enter}');
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(row()).toHaveAttribute('data-state', 'closed');
	});

	it('🔴 U-65.6 (negative): the caller’s words are text nodes — markup in a title, a value or the help is shown as written, never drawn', () => {
		render(Harness, {
			props: { value: '<img src=x onerror=alert(1)>', help: '<b>bold</b>', open: false }
		});
		expect(row().querySelector('img')).toBeNull();
		expect(row().querySelector('[data-slot="editable-row-value"]')?.textContent?.trim()).toBe(
			'<img src=x onerror=alert(1)>'
		);
	});

	it('it does not take the focus at its first paint, even open', () => {
		render(Harness, { props: { open: true } });
		expect(document.body).toHaveFocus();
	});
});
