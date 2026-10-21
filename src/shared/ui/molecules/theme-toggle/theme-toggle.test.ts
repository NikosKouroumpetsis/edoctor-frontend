import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { page } from '$app/state';
import { theme } from '$shared/preferences/theme';
import ThemeToggle from './theme-toggle.svelte';

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

afterEach(() => {
	theme.set('light');
	window.localStorage.clear();
	visit('/');
});

describe('ThemeToggle', () => {
	it('names the action in Greek on Greek pages, with no English label', async () => {
		const user = userEvent.setup({ delay: null });
		visit('/doctors');
		render(ThemeToggle);

		const toDark = screen.getByRole('button', { name: 'Σκούρο θέμα' });
		expect(toDark).toHaveAttribute('title', 'Σκούρο θέμα');
		expect(screen.queryByRole('button', { name: 'Dark theme' })).not.toBeInTheDocument();

		await user.click(toDark);

		const toLight = screen.getByRole('button', { name: 'Φωτεινό θέμα' });
		expect(toLight).toHaveAttribute('title', 'Φωτεινό θέμα');
		expect(screen.queryByRole('button', { name: 'Light theme' })).not.toBeInTheDocument();
	});

	it('names the action in English under /en, with no Greek label', async () => {
		const user = userEvent.setup({ delay: null });
		visit('/en/doctors');
		render(ThemeToggle);

		const toDark = screen.getByRole('button', { name: 'Dark theme' });
		expect(toDark).toHaveAttribute('title', 'Dark theme');
		expect(screen.queryByRole('button', { name: 'Σκούρο θέμα' })).not.toBeInTheDocument();

		await user.click(toDark);

		const toLight = screen.getByRole('button', { name: 'Light theme' });
		expect(toLight).toHaveAttribute('title', 'Light theme');
		expect(screen.queryByRole('button', { name: 'Φωτεινό θέμα' })).not.toBeInTheDocument();
	});
});
