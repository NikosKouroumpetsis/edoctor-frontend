import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './accordion.harness.svelte';

describe('Accordion', () => {
	it('expands an item on trigger click and links trigger/region via ARIA', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { type: 'single' } });
		const trigger = screen.getByRole('button', { name: 'Question one' });
		expect(trigger).toHaveAttribute('aria-expanded', 'false');

		await user.click(trigger);
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		const region = await screen.findByRole('region');
		expect(region).toHaveTextContent('Answer one');
		expect(region).toHaveAttribute('aria-labelledby', trigger.id);
	});

	it('single mode collapses the previous item when another opens', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { type: 'single' } });
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		await screen.findByText('Answer one');
		await user.click(screen.getByRole('button', { name: 'Question two' }));
		await screen.findByText('Answer two');
		await waitFor(() => expect(screen.queryByText('Answer one')).not.toBeInTheDocument());
	});

	it('multiple mode keeps several items open', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { type: 'multiple' } });
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		await user.click(screen.getByRole('button', { name: 'Question two' }));
		expect(await screen.findByText('Answer one')).toBeInTheDocument();
		expect(await screen.findByText('Answer two')).toBeInTheDocument();
	});
});
