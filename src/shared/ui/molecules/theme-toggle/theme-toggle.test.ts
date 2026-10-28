import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { theme } from '$shared/preferences/theme';
import ThemeToggle from './theme-toggle.svelte';

afterEach(() => {
	theme.set('light');
	window.localStorage.clear();
});

describe('ThemeToggle', () => {
	it('U-03.8: names the action with the caller’s words and flips the theme', async () => {
		const user = userEvent.setup({ delay: null });
		render(ThemeToggle, { props: { lightLabel: 'Φωτεινό θέμα', darkLabel: 'Σκούρο θέμα' } });

		const toDark = screen.getByRole('button', { name: 'Σκούρο θέμα' });
		expect(toDark).toHaveAttribute('title', 'Σκούρο θέμα');
		expect(toDark.querySelector('[data-icon="moon-outline"]')).not.toBeNull();
		await user.click(toDark);

		const toLight = screen.getByRole('button', { name: 'Φωτεινό θέμα' });
		expect(toLight.querySelector('[data-icon="sunny-outline"]')).not.toBeNull();
		expect(theme.resolved).toBe('dark');
	});
});
