import type { Preview } from '@storybook/sveltekit';
// Brings in semantic color tokens (:root/.dark), generated non-color tokens,
// Tailwind v4, tw-animate-css and the Inter font — exactly what the app loads.
import '../src/routes/layout.css';

/**
 * The widths the orchestrator snapshots (`globals=viewport:z744`): a phone, the tablet, the two laptop steps the
 * frame changes at (950 · 1128, where the bottom bar hides) and two desktops. The key is the global's value.
 */
const viewports = {
	z375: { name: '375 · phone', styles: { width: '375px', height: '812px' }, type: 'mobile' },
	z744: { name: '744 · tablet', styles: { width: '744px', height: '1133px' }, type: 'tablet' },
	z950: {
		name: '950 · small laptop',
		styles: { width: '950px', height: '800px' },
		type: 'desktop'
	},
	z1128: { name: '1128 · laptop', styles: { width: '1128px', height: '800px' }, type: 'desktop' },
	z1440: { name: '1440 · desktop', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
	z1920: { name: '1920 · wide', styles: { width: '1920px', height: '1080px' }, type: 'desktop' }
} as const;

const preview: Preview = {
	parameters: {
		controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
		a11y: { test: 'error' }, // fail a story on serious axe violations
		viewport: { options: viewports }
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
