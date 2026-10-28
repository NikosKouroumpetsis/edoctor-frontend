import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Button from './button.svelte';
import Harness from './button.harness.svelte';
import { buttonClasses } from './index';

const labelOf = (button: HTMLElement) => button.querySelector('span') as HTMLElement;

describe('Button', () => {
	it('U-02.2: defaults to the md radius and a normal-case label, bordered primary, 48 high', () => {
		render(Button, { props: { label: 'Συνέχεια' } });
		const button = screen.getByRole('button', { name: 'Συνέχεια' });
		expect(button).toHaveClass('rounded-md', 'border', 'border-primary', 'bg-primary');
		expect(button).toHaveClass('min-h-control-md', 'min-w-touch', 'px-5', 'py-3');
		expect(labelOf(button)).toHaveClass('normal-case', 'tracking-normal', 'text-body-sm');
		expect(labelOf(button)).toHaveClass('font-semibold', 'text-primary-foreground');
		expect(button).toHaveAttribute('type', 'button');
	});

	it('U-03.1: every tone paints the application fill, border and label colour', () => {
		const looks = {
			primary: ['bg-primary', 'border-primary', 'text-primary-foreground'],
			secondary: ['bg-secondary/5', 'border-secondary/10', 'text-muted-foreground'],
			accent: ['bg-accent', 'border-accent', 'text-secondary-foreground'],
			contrast: ['bg-secondary', 'border-secondary', 'text-secondary-foreground'],
			ghost: ['bg-card/40', 'border-border/60', 'text-muted-foreground'],
			muted: ['bg-foreground/5', 'border-secondary/10', 'text-muted-foreground'],
			outline: ['bg-transparent', 'border-foreground', 'text-foreground']
		} as const;
		for (const [tone, [fill, border, text]] of Object.entries(looks)) {
			const view = render(Button, { props: { label: tone, tone: tone as keyof typeof looks } });
			const button = screen.getByRole('button', { name: tone });
			expect(button, tone).toHaveClass(fill, border);
			expect(labelOf(button), tone).toHaveClass(text);
			view.unmount();
		}
	});

	it('U-03.1: a caller-named text role turns a neutral tone label foreground (S-32.19)', () => {
		render(Button, { props: { label: 'Όλα', tone: 'ghost', textClass: 'text-title-sm' } });
		const label = labelOf(screen.getByRole('button', { name: 'Όλα' }));
		expect(label).toHaveClass('text-title-sm', 'text-foreground');
		expect(label).not.toHaveClass('text-body-sm');
	});

	it('U-03.1: size lg, every radius and an unbordered button', () => {
		const view = render(Button, {
			props: { label: 'Μεγάλο', size: 'lg', radius: 'full', bordered: false }
		});
		const button = screen.getByRole('button', { name: 'Μεγάλο' });
		expect(button).toHaveClass('min-h-control-lg', 'px-6', 'py-4', 'rounded-full', 'border-0');
		expect(button).not.toHaveClass('border-primary');
		view.unmount();
		for (const radius of ['sm', 'md', 'lg', 'full'] as const) {
			const one = render(Button, { props: { label: radius, radius } });
			expect(screen.getByRole('button', { name: radius })).toHaveClass(`rounded-${radius}`);
			one.unmount();
		}
	});

	it('U-03.9: an uppercase label is Greek capitals without tonos, named with its accents', () => {
		render(Button, { props: { label: 'Προσθήκη είδους', labelCase: 'uppercase' } });
		const button = screen.getByRole('button', { name: 'Προσθήκη είδους' });
		expect(labelOf(button)).toHaveTextContent('ΠΡΟΣΘΗΚΗ ΕΙΔΟΥΣ');
		expect(labelOf(button)).toHaveClass('uppercase', 'tracking-control');
	});

	it('U-03.1: loading swaps the label for a spinner, keeps the name and refuses presses', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		render(Button, { props: { label: 'Αποστολή', loading: true, onclick } });
		const button = screen.getByRole('button', { name: 'Αποστολή' });
		expect(button).toHaveAttribute('aria-busy', 'true');
		expect(button).toBeDisabled();
		expect(button.querySelector('[data-slot="spinner"]')).toHaveClass('text-primary-foreground');
		expect(button).not.toHaveTextContent('Αποστολή');
		await user.click(button);
		expect(onclick).not.toHaveBeenCalled();
	});

	it('U-03.1: a leading glyph sits before the label, hidden from assistive tech', () => {
		render(Harness, { props: { withLeading: true } });
		const button = screen.getByRole('button', { name: 'Αναζήτηση' });
		const leading = screen.getByTestId('leading');
		expect(button).toContainElement(leading);
		expect(leading.parentElement).toHaveAttribute('aria-hidden', 'true');
	});

	it('U-03.1: href renders a link; disabled removes the href and leaves the tab order', () => {
		const view = render(Button, { props: { label: 'Σύνδεση', href: '/login' } });
		expect(screen.getByRole('link', { name: 'Σύνδεση' })).toHaveAttribute('href', '/login');
		view.unmount();
		render(Button, { props: { label: 'Σύνδεση', href: '/login', disabled: true } });
		const link = screen.getByRole('link', { name: 'Σύνδεση' });
		expect(link).not.toHaveAttribute('href');
		expect(link).toHaveAttribute('aria-disabled', 'true');
		expect(link).toHaveAttribute('tabindex', '-1');
	});

	it('U-03.1: buttonClasses gives a trigger the box and the label of a tone', () => {
		const classes = buttonClasses({ tone: 'outline' }).split(' ');
		expect(classes).toEqual(
			expect.arrayContaining(['border-foreground', 'rounded-md', 'text-foreground'])
		);
	});
});
