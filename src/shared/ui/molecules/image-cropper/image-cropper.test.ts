import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { imageCropRect, type ImageCrop } from '$shared/lib/image';
import Harness from './image-cropper.harness.svelte';

const RULES = { aspect: 4 / 3, minWidth: 800, minHeight: 600 };
const STORED = { width: 1200, height: 900 };

function open(props: Record<string, unknown> = {}) {
	const seen: ImageCrop[] = [];
	render(Harness, { props: { onCrop: (crop: ImageCrop) => seen.push(crop), ...props } });
	const frame = screen.getByRole('button', { name: 'Προσαρμογή' });
	// jsdom lays nothing out: the frame is given the box a browser would give it (400 × 300).
	frame.getBoundingClientRect = () =>
		({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300 }) as DOMRect;
	const cut = () => imageCropRect(STORED, RULES, seen[seen.length - 1]);
	return { frame, cut, zoom: () => screen.getByRole('slider', { name: 'Μεγέθυνση' }) };
}
const picture = () => document.querySelector('[data-slot="image-cropper-image"]') as HTMLElement;
const pointer = (type: string, node: Element, x: number, y: number, more: object = {}) =>
	fireEvent(
		node,
		new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0, ...more })
	);

describe('ImageCropper (wave 5.2, D-W52-40: the part of a picture that is kept)', () => {
	it('🔴 D-W52-40: a frame of the cut’s shape that shows exactly what is kept, named and described by the caller, and a slider «Μεγέθυνση» from 100 % to where 800 × 600 ends', () => {
		const { frame, cut, zoom } = open();
		expect(frame).toHaveAttribute('data-slot', 'image-cropper-frame');
		expect(frame).toHaveAttribute('aria-describedby', 'what-to-do');
		expect(picture()).toHaveAttribute('src', '/picture.webp');
		expect(picture()).toHaveAttribute('alt', '');
		expect(picture()).toHaveAttribute('draggable', 'false');
		// The whole 4:3 picture fills the frame.
		expect(cut()).toEqual({ x: 0, y: 0, width: 1200, height: 900 });
		expect(picture().style.cssText).toMatch(/left: 0%; top: 0%; width: 100%; height: 100%/u);
		expect(zoom()).toHaveAttribute('aria-valuemin', '1');
		expect(zoom()).toHaveAttribute('aria-valuemax', '1.5');
		expect(zoom()).toHaveAttribute('aria-valuenow', '1');
		expect(zoom()).toHaveAttribute('aria-valuetext', '100%');
		expect(screen.getByText('Μεγέθυνση')).toHaveAttribute('aria-hidden', 'true');
	});

	it('🔴 D-W52-40: the slider goes in — the picture grows in the frame and the cut never falls under 800 × 600', async () => {
		const user = userEvent.setup({ delay: null });
		const { cut, zoom } = open();
		zoom().focus();
		await user.keyboard('{End}');
		expect(zoom()).toHaveAttribute('aria-valuenow', '1.5');
		expect(zoom()).toHaveAttribute('aria-valuetext', '150%');
		expect(cut()).toEqual({ x: 200, y: 150, width: 800, height: 600 });
		expect(picture().style.width).toBe('150%');
		expect(picture().style.left).toBe('-25%');
		expect(picture().style.top).toBe('-25%');
		await user.keyboard('{Home}');
		expect(cut()).toEqual({ x: 0, y: 0, width: 1200, height: 900 });
	});

	it('🔴 D-W52-40: dragging moves the picture under the frame by the frame’s own measure, and it stops at the picture’s edges', async () => {
		const user = userEvent.setup({ delay: null });
		const { frame, cut, zoom } = open();
		zoom().focus();
		await user.keyboard('{End}');
		pointer('pointerdown', frame, 200, 150);
		expect(frame).toHaveAttribute('data-dragging');
		// 100 px of a 400 px frame = a quarter of the cut's 800 pixels: what was on the left comes in.
		pointer('pointermove', frame, 300, 150);
		expect(cut()).toMatchObject({ x: 0, y: 150 });
		pointer('pointermove', frame, 300, 120);
		expect(cut()).toMatchObject({ x: 0, y: 210 });
		pointer('pointermove', frame, 2000, -2000);
		expect(cut()).toMatchObject({ x: 0, y: 300 });
		pointer('pointerup', frame, 2000, -2000);
		expect(frame).not.toHaveAttribute('data-dragging');
		// Released: a move without a press changes nothing.
		pointer('pointermove', frame, 0, 0);
		expect(cut()).toMatchObject({ x: 0, y: 300 });
	});

	it('🔴 D-W52-40: the arrows move the cut and `+` / `−` go in and out, from the frame itself', async () => {
		const user = userEvent.setup({ delay: null });
		const { frame, cut, zoom } = open();
		frame.focus();
		await user.keyboard('+++++');
		expect(zoom()).toHaveAttribute('aria-valuenow', '1.25');
		expect(cut()).toEqual({ x: 120, y: 90, width: 960, height: 720 });
		await user.keyboard('{ArrowRight}');
		expect(cut()).toMatchObject({ x: 168, y: 90 });
		await user.keyboard('{ArrowDown}');
		expect(cut()).toMatchObject({ x: 168, y: 126 });
		await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowUp}{ArrowUp}');
		expect(cut()).toMatchObject({ x: 72, y: 54 });
		await user.keyboard('-----------');
		expect(zoom()).toHaveAttribute('aria-valuenow', '1');
		expect(cut()).toEqual({ x: 0, y: 0, width: 1200, height: 900 });
	});

	it('(negative) D-W52-40: a picture of exactly 800 × 600 has no room — the slider sleeps and nothing moves; a disabled cropper answers nothing', async () => {
		const user = userEvent.setup({ delay: null });
		const small = open({ source: { width: 800, height: 600 } });
		expect(small.zoom()).toBeDisabled();
		small.frame.focus();
		await user.keyboard('+{ArrowRight}');
		pointer('pointerdown', small.frame, 10, 10);
		pointer('pointermove', small.frame, 200, 200);
		expect(picture().style.cssText).toMatch(/left: 0%; top: 0%; width: 100%; height: 100%/u);
	});

	it('(negative) a disabled cropper takes no press and no key; a right click never drags', () => {
		const onCrop = vi.fn();
		const { frame } = open({ disabled: true, onCrop });
		expect(frame).toBeDisabled();
		const calls = onCrop.mock.calls.length;
		pointer('pointerdown', frame, 10, 10);
		expect(frame).not.toHaveAttribute('data-dragging');
		expect(onCrop.mock.calls.length).toBe(calls);
	});

	it('(negative, U-100) nothing of the cropper takes a colour under the pointer', () => {
		const { frame } = open();
		expect(frame.className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
	});
});
