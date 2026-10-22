import { describe, expect, it } from 'vitest';
import {
	breakpoints,
	containers,
	controls,
	icon,
	leading,
	media,
	platform,
	radius,
	sheet,
	spacing,
	spacingScale,
	step,
	steps,
	typography
} from './index';
import { tokensToCss } from './to-css';

const onGrid = (value: number) => value % steps.base === 0;

describe('shared size scale', () => {
	it('never sets text under 12px and keeps running text at 16px', () => {
		for (const [role, { size }] of Object.entries(typography))
			expect(size, role).toBeGreaterThanOrEqual(12);
		expect(typography['body-lg'].size).toBe(16);
	});

	it('keeps every control at least the touch target, with an 8px gap between targets', () => {
		expect(controls.touch).toBeGreaterThanOrEqual(48);
		expect(controls['touch-gap']).toBeGreaterThanOrEqual(8);
		for (const name of ['control-md', 'control-lg', 'control-xl', 'row', 'row-lg'] as const) {
			expect(controls[name], name).toBeGreaterThanOrEqual(controls.touch);
		}
	});

	it('puts every named length, container, icon and radius on the 4px grid', () => {
		const families = { spacing, controls, containers, icon, radius, platform: platform.spacing };
		for (const [family, values] of Object.entries(families)) {
			for (const [name, value] of Object.entries(values)) {
				expect(onGrid(value), `${family}.${name} = ${value}`).toBe(true);
			}
		}
	});

	it('lists the breakpoints in ascending order', () => {
		const widths = Object.values(breakpoints);
		expect(widths).toEqual([...widths].sort((a, b) => a - b));
	});

	it('gives every spacing name one owner and no leading or container name a spacing twin', () => {
		const names = [spacing, controls, media, platform.spacing].flatMap((family) =>
			Object.keys(family)
		);
		const sheetNames = Object.keys(sheet).map((name) => `sheet-${name}`);
		expect(new Set([...names, ...sheetNames]).size).toBe(names.length + sheetNames.length);
		expect(Object.keys(spacingScale)).toHaveLength(names.length + sheetNames.length);
		for (const name of Object.keys(leading)) expect(name in spacingScale, name).toBe(false);
		for (const name of Object.keys(containers)) expect(name in spacingScale, name).toBe(false);
	});

	it('measures runtime lengths on the step scale', () => {
		expect(step(1.5)).toBe(6);
		expect(step(steps.max)).toBe(24);
	});
});

describe('tokensToCss', () => {
	const css = tokensToCss();

	it('sets the 4px step and resets each owned namespace before defining it', () => {
		expect(css).toContain(`--spacing: ${steps.base}px;`);
		for (const namespace of ['text', 'leading', 'radius', 'container', 'breakpoint']) {
			const reset = css.indexOf(`--${namespace}-*: initial;`);
			expect(reset, namespace).toBeGreaterThan(-1);
			expect(reset, namespace).toBeLessThan(css.indexOf(`--${namespace}-`, reset + 1));
		}
		expect(css).not.toContain('--spacing-*: initial');
	});

	it('emits every role, name, container and breakpoint the registry holds', () => {
		expect(css).toContain('--text-body-lg: 16px;');
		expect(css).toContain('--text-body-lg--line-height: 1.5;');
		expect(css).toContain('--leading-flat: 1;');
		expect(css).toContain('--spacing-touch: 48px;');
		expect(css).toContain('--spacing-bar-top: 64px;');
		expect(css).toContain('--spacing-sheet-lg: 85dvh;');
		expect(css).toContain('--container-form: 560px;');
		expect(css).toContain('--breakpoint-split: 950px;');
		expect(css).toContain('--radius-md: 12px;');
		for (const name of Object.keys(spacingScale)) expect(css).toContain(`--spacing-${name}:`);
		for (const name of Object.keys(icon)) expect(css).toContain(`@utility icon-${name} {`);
	});
});
