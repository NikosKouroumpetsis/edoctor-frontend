import type { Preview } from '@storybook/sveltekit';
// Brings in semantic color tokens (:root/.dark), generated non-color tokens,
// Tailwind v4, tw-animate-css and the Inter font — exactly what the app loads.
import '../src/routes/layout.css';

const preview: Preview = {
	parameters: {
		controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
		a11y: { test: 'error' } // fail a story on serious axe violations
	},
	// Light/dark toolbar switch reusing OUR theme system (the `.dark` class).
	globalTypes: {
		theme: {
			description: 'Color theme',
			defaultValue: 'light',
			toolbar: {
				title: 'Theme',
				icon: 'circlehollow',
				items: [
					{ value: 'light', title: 'Light', icon: 'sun' },
					{ value: 'dark', title: 'Dark', icon: 'moon' }
				],
				dynamicTitle: true
			}
		}
	},
	decorators: [
		(story, { globals }) => {
			// Side-effect decorator: toggle the global `.dark` class our tokens key off.
			if (typeof document !== 'undefined') {
				document.documentElement.classList.toggle('dark', globals.theme === 'dark');
				document.documentElement.style.colorScheme = globals.theme === 'dark' ? 'dark' : 'light';
			}
			return story();
		}
	]
};

export default preview;
