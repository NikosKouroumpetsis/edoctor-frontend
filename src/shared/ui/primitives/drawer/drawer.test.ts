import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { holdTransitions } from '../../../../../vitest-mocks/css-transitions';
import { __getLockCount } from '$shared/lib/headless';
import Harness from './drawer.harness.svelte';

describe('Drawer', () => {
	it('opens from the trigger with a drag handle and the requested direction', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { direction: 'bottom' } });
		await user.click(screen.getByRole('button', { name: 'Open drawer' }));

		const drawer = screen.getByRole('dialog');
		expect(drawer).toHaveAttribute('data-direction', 'bottom');
		expect(drawer).toHaveAccessibleName('Filters');
		expect(drawer.querySelector('[data-slot="drawer-handle"]')).toBeInTheDocument();
	});

	it('defaults the bottom panel to max-h-sheet-lg and applies the size prop', async () => {
		const user = userEvent.setup();
		const def = render(Harness, { props: { direction: 'bottom' } });
		await user.click(def.getByRole('button', { name: 'Open drawer' }));
		expect(def.getByRole('dialog')).toHaveClass('max-h-sheet-lg');
		def.unmount();

		const sm = render(Harness, { props: { direction: 'bottom', size: 'sm' } });
		await user.click(sm.getByRole('button', { name: 'Open drawer' }));
		expect(sm.getByRole('dialog')).toHaveClass('max-h-sheet-md');
	});

	it('closes on Escape', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open drawer' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('closes when dragged past the dismiss threshold', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { direction: 'bottom' } });
		await user.click(screen.getByRole('button', { name: 'Open drawer' }));
		const drawer = screen.getByRole('dialog');

		await fireEvent.pointerDown(drawer, { pointerId: 1, button: 0, clientY: 0 });
		await fireEvent.pointerMove(drawer, { pointerId: 1, clientY: 300 });
		await fireEvent.pointerUp(drawer, { pointerId: 1, clientY: 300 });

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('snaps back and stays open on a small, slow drag', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { direction: 'bottom' } });
		await user.click(screen.getByRole('button', { name: 'Open drawer' }));
		const drawer = screen.getByRole('dialog');

		await fireEvent.pointerDown(drawer, { pointerId: 1, button: 0, clientY: 0 });
		await fireEvent.pointerMove(drawer, { pointerId: 1, clientY: 10 });
		// Second identical move drops the release velocity to ~0 (no fling).
		await fireEvent.pointerMove(drawer, { pointerId: 1, clientY: 10 });
		await fireEvent.pointerUp(drawer, { pointerId: 1, clientY: 10 });

		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('U-03.1 (MINOR-7): only its own backdrop closes it — a press in a portalled layer outside the panel does not', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open drawer' }));
		const layer = document.createElement('div');
		document.body.append(layer);
		await user.pointer({ keys: '[MouseLeft]', target: layer });
		expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
		layer.remove();
		await user.click(document.body.querySelector('[data-slot="drawer-overlay"]') as HTMLElement);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('U-03.1 (MINOR-7): a drawer that is not dismissible ignores its backdrop and Escape', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { dismissible: false } });
		await user.click(screen.getByRole('button', { name: 'Open drawer' }));
		await user.click(document.body.querySelector('[data-slot="drawer-overlay"]') as HTMLElement);
		await user.keyboard('{Escape}');
		expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
	});

	// The R2 review's note («the backdrop turns full again before it fades, after a drag that closes it»): the
	// R2 code reset the offset and drew the backdrop at an inline `opacity: 1` before its Svelte fade out.
	it('U-12.2: a drag that closes it leaves from where the drag left it; the backdrop fades from its dimming', async () => {
		const css = holdTransitions();
		const user = userEvent.setup();
		render(Harness, { props: { direction: 'bottom' } });
		await user.click(screen.getByRole('button', { name: 'Open drawer' }));
		const drawer = screen.getByRole('dialog');
		const backdrop = document.body.querySelector('[data-slot="drawer-overlay"]') as HTMLElement;
		expect(backdrop.style.opacity).toBe('');

		await fireEvent.pointerDown(drawer, { pointerId: 1, button: 0, clientY: 0 });
		await fireEvent.pointerMove(drawer, { pointerId: 1, clientY: 300 });
		// While the finger holds it the drag moves it at once (no transition) and dims the backdrop less.
		expect(drawer.style.transform).toBe('translateY(300px)');
		expect(drawer).toHaveClass('transition-none');
		expect(backdrop.style.opacity).not.toBe('');
		expect(backdrop).toHaveClass('transition-none');
		await fireEvent.pointerUp(drawer, { pointerId: 1, clientY: 300 });

		expect(drawer).toHaveAttribute('data-state', 'closed');
		expect(drawer.style.transform).toBe('translateY(300px)');
		expect(drawer).toHaveClass(
			'transition-[translate,transform]',
			'data-[state=closed]:translate-y-full'
		);
		expect(drawer).not.toHaveClass('transition-none');
		expect(backdrop.style.opacity).toBe('');
		expect(backdrop).not.toHaveClass('transition-none');
		// U-12.9: the scroll lock holds until the drawer leaves the DOM.
		expect(__getLockCount()).toBe(1);
		css.end(drawer);
		css.end(backdrop);
		await waitFor(() => expect(drawer.isConnected).toBe(false));
		expect(__getLockCount()).toBe(0);
	});

	it('U-12.9: a drawer unmounted on its way out lets the scroll lock go', async () => {
		holdTransitions();
		const user = userEvent.setup();
		const view = render(Harness, { props: { direction: 'bottom' } });
		await user.click(screen.getByRole('button', { name: 'Open drawer' }));
		expect(__getLockCount()).toBe(1);
		await user.keyboard('{Escape}');
		expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-state', 'closed');
		expect(__getLockCount()).toBe(1);
		view.unmount();
		expect(__getLockCount()).toBe(0);
	});
});
