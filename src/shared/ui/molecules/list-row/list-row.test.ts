import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './list-row.harness.svelte';

const user = () => userEvent.setup({ delay: null });
const press = () => screen.getByTestId('row').querySelector('[data-slot="list-row-press"]');

describe('ListRow (U-70 Π5)', () => {
	it('a row that opens: named by its title, `aria-expanded` and `aria-controls`, its body under it', async () => {
		render(Harness, { props: { opens: true } });
		const row = screen.getByRole('button', { name: '<b>Τίτλος</b>' });
		expect(row).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByTestId('body')).toBeNull();
		await user().click(row);
		expect(row).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByTestId('body')).toBeInTheDocument();
		expect(row.getAttribute('aria-controls')).toBe(
			screen.getByRole('region').getAttribute('id') ?? ''
		);
	});

	it('a link: «›» and the address, its press the caller’s', async () => {
		const onPress = vi.fn();
		render(Harness, { props: { href: '#there', onPress } });
		const link = screen.getByRole('link', { name: '<b>Τίτλος</b>' });
		expect(link).toHaveAttribute('href', '#there');
		await user().click(link);
		expect(onPress).toHaveBeenCalledOnce();
	});

	it('what acts by itself sits beside the press, never inside it', async () => {
		const onSignIn = vi.fn();
		render(Harness, { props: { opens: true, onSignIn } });
		const signIn = screen.getByTestId('sign-in');
		expect(press()?.contains(signIn)).toBe(false);
		await user().click(signIn);
		expect(onSignIn).toHaveBeenCalledOnce();
		expect(press()).toHaveAttribute('aria-expanded', 'false');
	});

	it('the facts follow the row’s own width, by CSS: under the texts, at the end from 520', () => {
		render(Harness, { props: { opens: true } });
		const root = screen.getByTestId('row');
		expect(root).toHaveClass('@container');
		expect(root.querySelector('[data-slot="list-row-meta"]')).toHaveClass('row-wide:hidden');
		expect(root.querySelector('[data-slot="list-row-end"]')).toHaveClass('hidden', 'row-wide:flex');
	});

	it('🔴 U-65.6: the words are text, never markup', () => {
		render(Harness, { props: { opens: true } });
		const root = screen.getByTestId('row');
		expect(root.querySelector('b')).toBeNull();
		expect(root.querySelector('[data-slot="list-row-subtitle"] i')).toBeNull();
		expect(root).toHaveTextContent('<b>Τίτλος</b>');
	});
});
