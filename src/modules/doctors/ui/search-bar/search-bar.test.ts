import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SearchBar from './search-bar.svelte';

describe('DoctorSearchBar', () => {
	it('collects specialty + location and emits a search query', async () => {
		const user = userEvent.setup({ delay: null });
		const onSearch = vi.fn();
		render(SearchBar, { props: { onSearch } });

		// Pick a specialty via the popover + command.
		await user.click(screen.getByRole('button', { name: /Specialty/i }));
		await user.click(await screen.findByRole('option', { name: 'Dermatology' }));

		// Type a location.
		await user.type(screen.getByLabelText('Location'), 'Athens');

		await user.click(screen.getByRole('button', { name: 'Search' }));
		expect(onSearch).toHaveBeenCalledWith(
			expect.objectContaining({ specialty: 'Dermatology', location: 'Athens' })
		);
	});

	it('filters specialties in the command palette', async () => {
		const user = userEvent.setup({ delay: null });
		render(SearchBar);
		await user.click(screen.getByRole('button', { name: /Specialty/i }));
		await user.type(await screen.findByRole('combobox', { name: 'Search specialty' }), 'neuro');
		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(1);
		expect(options[0]).toHaveTextContent('Neurology');
	});
});
