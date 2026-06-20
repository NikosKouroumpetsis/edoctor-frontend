import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
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
});
