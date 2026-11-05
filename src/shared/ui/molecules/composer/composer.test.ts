import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { Composer } from '.';

const base = {
	placeholder: 'Γράψτε',
	sendLabel: 'Αποστολή',
	max: 2000,
	countFrom: 1800,
	counterLabel: (count: number, max: number) => `${count} / ${max}`,
	overLabel: 'Πολύ μεγάλο',
	testId: 'c'
};
const send = () => screen.getByRole('button', { name: 'Αποστολή' });
const field = () => screen.getByRole('textbox', { name: 'Γράψτε' }) as HTMLTextAreaElement;

describe('Composer (U-84 Π2)', () => {
	it('nothing to send: «↑» is off; white space is nothing either', () => {
		render(Composer, { props: { ...base, onSend: vi.fn(), value: '   ' } });
		expect(send()).toBeDisabled();
	});

	it('the counter shows from 1.800 and counts code points, as the server', () => {
		render(Composer, { props: { ...base, onSend: vi.fn(), value: '🩺'.repeat(1800) } });
		expect(screen.getByText('1800 / 2000')).toBeInTheDocument();
	});

	it('below 1.800 no counter', () => {
		const { container } = render(Composer, {
			props: { ...base, onSend: vi.fn(), value: 'α'.repeat(1799) }
		});
		expect(container.querySelector('[data-slot="composer-count"]')).toBeNull();
	});

	it('(negative) past 2.000: red, its line, «↑» off and Enter sends nothing; the words stay', async () => {
		const onSend = vi.fn();
		render(Composer, {
			props: { ...base, onSend, value: 'α'.repeat(2001), enterSends: true }
		});
		expect(screen.getByRole('alert')).toHaveTextContent('Πολύ μεγάλο');
		expect(send()).toBeDisabled();
		expect(field()).toHaveAttribute('aria-invalid', 'true');
		await fireEvent.keyDown(field(), { key: 'Enter' });
		expect(onSend).not.toHaveBeenCalled();
		expect(field().value).toHaveLength(2001);
	});

	it('from 744 Enter sends and ⇧Enter does not', async () => {
		const onSend = vi.fn();
		render(Composer, { props: { ...base, onSend, value: 'Γεια', enterSends: true } });
		await fireEvent.keyDown(field(), { key: 'Enter', shiftKey: true });
		expect(onSend).not.toHaveBeenCalled();
		await fireEvent.keyDown(field(), { key: 'Enter' });
		expect(onSend).toHaveBeenCalledOnce();
	});

	it('below 744 Enter is a new line', async () => {
		const onSend = vi.fn();
		render(Composer, { props: { ...base, onSend, value: 'Γεια', enterSends: false } });
		await fireEvent.keyDown(field(), { key: 'Enter' });
		expect(onSend).not.toHaveBeenCalled();
	});

	it('a word being composed (an IME) is not sent by its Enter', async () => {
		const onSend = vi.fn();
		render(Composer, { props: { ...base, onSend, value: 'Γεια', enterSends: true } });
		await fireEvent.keyDown(field(), { key: 'Enter', isComposing: true });
		expect(onSend).not.toHaveBeenCalled();
	});

	it('a refusal’s line, with the words still in the field', () => {
		render(Composer, { props: { ...base, onSend: vi.fn(), value: 'Γεια', error: 'Πολλά' } });
		expect(screen.getByRole('alert')).toHaveTextContent('Πολλά');
		expect(field().value).toBe('Γεια');
	});

	it('🔴 U-81.2: below 744 the application’s numbers (48, «↑» 32 / 16, up to 288), from 744 the prototype’s; the corner 24 at both', () => {
		render(Composer, { props: { ...base, onSend: vi.fn(), value: '' } });
		expect(field()).toHaveClass('min-h-touch', 'max-h-menu-max-h', 'py-3', 'text-body-lg');
		expect(field()).toHaveClass(
			'tablet:min-h-composer-min-h',
			'tablet:max-h-composer',
			'tablet:py-2.5',
			'tablet:text-bubble'
		);
		const pill = field().parentElement as HTMLElement;
		expect(pill).toHaveClass('rounded-xl');
		expect(pill.className).not.toContain('rounded-composer');
		expect(send()).toHaveClass('size-touch');
		const circle = send().firstElementChild as HTMLElement;
		expect(circle).toHaveClass(
			'size-control-xs',
			'group-disabled:bg-foreground/8',
			'tablet:size-composer-send',
			'tablet:group-disabled:bg-foreground/6'
		);
		expect(circle.firstElementChild).toHaveClass('icon-sm', 'tablet:icon-md');
	});
});
