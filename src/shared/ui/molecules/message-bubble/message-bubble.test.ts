import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { MessageBubble } from '.';

afterEach(() => vi.useRealTimers());

describe('MessageBubble (U-84 Π2)', () => {
	it('mine or the other’s, and how it left', () => {
		render(MessageBubble, { props: { text: 'Γεια', mine: true, status: 'failed', testId: 'b' } });
		const bubble = screen.getByTestId('b');
		expect(bubble).toHaveTextContent('Γεια');
		expect(bubble).toHaveAttribute('data-mine', 'true');
		expect(bubble).toHaveAttribute('data-status', 'failed');
	});

	it('🔴 U-65.6 (negative): markup is shown as it was written, and nothing of it runs', () => {
		const text =
			'<script>alert("x")</' + 'script> <b>έντονα;</b> <img src=x onerror=alert(1)> 🩺💊👍🏽';
		render(MessageBubble, { props: { text, testId: 'b' } });
		const bubble = screen.getByTestId('b');
		expect(bubble.textContent?.trim()).toBe(text);
		expect(bubble.querySelector('*')).toBeNull();
	});

	it('🔴 U-84: σύνδεσμοι όχι πατήσιμοι: an address is words, in no `<a>`', () => {
		const text = 'Δείτε https://evil.example/login ή www.evil.example ή mailto:a@evil.example';
		const { container } = render(MessageBubble, { props: { text, testId: 'b' } });
		expect(screen.getByTestId('b').textContent?.trim()).toBe(text);
		expect(container.querySelector('a')).toBeNull();
		const source = readFileSync(
			join(process.cwd(), 'src/shared/ui/molecules/message-bubble/message-bubble.svelte'),
			'utf8'
		);
		expect(source).not.toMatch(/\{@html|innerHTML|<a[\s>]|linkify|InlineLinkText|RichText/u);
	});

	it('a finger resting on it asks for its action; a pointer and a moved finger do not', async () => {
		vi.useFakeTimers();
		const onLongPress = vi.fn();
		render(MessageBubble, { props: { text: 'Γεια', onLongPress, testId: 'b' } });
		const bubble = screen.getByTestId('b');
		await fireEvent.pointerDown(bubble, { pointerType: 'mouse' });
		vi.advanceTimersByTime(800);
		expect(onLongPress).not.toHaveBeenCalled();
		await fireEvent.pointerDown(bubble, { pointerType: 'touch', clientX: 10, clientY: 10 });
		await fireEvent.pointerMove(bubble, { pointerType: 'touch', clientX: 10, clientY: 60 });
		vi.advanceTimersByTime(800);
		expect(onLongPress).not.toHaveBeenCalled();
		await fireEvent.pointerDown(bubble, { pointerType: 'touch' });
		vi.advanceTimersByTime(600);
		expect(onLongPress).toHaveBeenCalledOnce();
	});

	it('🔴 U-81.2: below 744 the application’s bubble (at least 48 × 48, 16 at 1.5, 12 inside), from 744 the prototype’s', () => {
		render(MessageBubble, { props: { text: 'Γεια', testId: 'b' } });
		expect(screen.getByTestId('b')).toHaveClass(
			'min-h-touch',
			'min-w-touch',
			'py-3',
			'text-body-lg',
			'tablet:min-h-0',
			'tablet:min-w-0',
			'tablet:py-2.5',
			'tablet:text-bubble'
		);
	});

	it('🔴 U-81.2: one on its way is as it is below 744, at 70 % only from 744', () => {
		render(MessageBubble, { props: { text: 'Γεια', status: 'pending', testId: 'b' } });
		expect(screen.getByTestId('b')).toHaveClass('tablet:opacity-70');
		expect(screen.getByTestId('b')).not.toHaveClass('opacity-70');
	});
});
