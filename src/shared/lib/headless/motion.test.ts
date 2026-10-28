import { afterEach, describe, expect, it } from 'vitest';
import { reduceMotion } from '../../../../vitest-mocks/reduce-motion';
import {
	cubicBezier,
	cubicBezierCss,
	motion,
	panelFade,
	type MotionEasing
} from '$shared/design/tokens';
import { panelFadeCurve, tokensToCss } from '$shared/design/tokens/to-css';
import * as headless from './index';
import { LEAVE_GRACE_MS, isMoving, leaveTimeout } from './motion';

/** The `linear()` points of a curve as [value, time] pairs. */
function linearPoints(css: string): [number, number][] {
	const body = /linear\((.*)\)$/.exec(css)?.[1] ?? '';
	return body.split(',').map((stop) => {
		const [value, time] = stop.trim().split(/\s+/);
		return [Number(value), Number.parseFloat(time) / 100];
	});
}

describe('the reduce-motion helper of the specs', () => {
	// Kept for the U-12.1 negatives: a spec turns the setting on and shows that the motion is the same.
	it('U-03.1 (NIT-3 of dyad 3): under reduceMotion() the query matches and its list has the setup’s listeners', () => {
		const setupList = window.matchMedia('(prefers-reduced-motion: reduce)');
		expect(setupList.matches).toBe(false);
		reduceMotion();
		const list = window.matchMedia('(prefers-reduced-motion: reduce)');
		expect(list.matches).toBe(true);
		expect(Object.keys(list).sort()).toEqual(Object.keys(setupList).sort());
		const listener = () => {};
		expect(() => {
			list.addEventListener('change', listener);
			list.removeEventListener('change', listener);
			list.addListener(listener);
			list.removeListener(listener);
		}).not.toThrow();
		expect(window.matchMedia('(min-width: 0)').matches).toBe(false);
	});
});

describe('motion of the kit (U-09.8, U-12)', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('U-09.8: the tokens name every duration and curve in one place; the theme makes them classes', () => {
		expect(motion.duration).toEqual({
			standard: 250,
			sheet: 250,
			accordion: 220,
			zoom: 220,
			label: 200,
			segment: 180,
			// U-14.1: Airbnb's fade of what arrives, on the `standard` curve.
			reveal: 800
		});
		expect(cubicBezierCss('standard')).toBe('cubic-bezier(0.2, 0, 0, 1)');
		const css = tokensToCss();
		for (const [name, value] of Object.entries(motion.duration)) {
			expect(css).toContain(`--transition-duration-${name}: ${value}ms;`);
		}
		for (const name of Object.keys(motion.easing) as MotionEasing[]) {
			expect(css).toContain(`--ease-${name}: ${cubicBezierCss(name)};`);
		}
	});

	it('U-09.8: the bézier solver meets the browser’s curve at its ends, its middle and the linear case', () => {
		const airbnb = cubicBezier(0.2, 0, 0, 1);
		expect(airbnb(0)).toBe(0);
		expect(airbnb(1)).toBe(1);
		expect(airbnb(0.5)).toBeCloseTo(0.8778, 3);
		const linear = cubicBezier(0.25, 0.25, 0.75, 0.75);
		for (const t of [0.1, 0.3, 0.7]) expect(linear(t)).toBeCloseTo(t, 5);
	});

	// The application's `panelStyle` (the R2 `riseIntoPlace`): the opacity is 0 for the first 35 % of the zoom's
	// progress, then linear in it; closing, Svelte drew it from `t = 1 - curve`. The CSS keeps both, as `linear()`.
	it('U-12.2: the modal panel fades on the zoom’s own curve — hidden for 35 % of it, then linear in it', () => {
		const opening = cubicBezier(...motion.easing['zoom-in']);
		const closing = cubicBezier(...motion.easing['zoom-out']);
		const h = panelFade.hiddenUntil;
		const inPoints = linearPoints(panelFadeCurve('zoom-in'));
		const outPoints = linearPoints(panelFadeCurve('zoom-out'));
		expect(inPoints[0]).toEqual([0, 0]);
		expect(inPoints.at(-1)).toEqual([1, 1]);
		for (const [value, time] of inPoints) {
			expect(value).toBeCloseTo(Math.max(0, (opening(time) - h) / (1 - h)), 3);
		}
		// Shown nowhere before the curve reaches 35 % (13.4 % of the time on `out(cubic)`).
		expect(inPoints.filter(([, time]) => opening(time) < h).every(([value]) => value === 0)).toBe(
			true
		);
		for (const [value, time] of outPoints) {
			// The CSS fades 1 ⇒ 0 by `1 - value`: Svelte's former opacity at `t = 1 - curve`.
			const former = Math.max(0, (1 - closing(time) - h) / (1 - h));
			expect(1 - value).toBeCloseTo(former, 3);
		}
		const css = tokensToCss();
		expect(css).toContain(
			`--ease-modal-panel-in: ${cubicBezierCss('zoom-in')}, ${panelFadeCurve('zoom-in')};`
		);
		expect(css).toContain(
			`--ease-modal-panel-out: ${cubicBezierCss('zoom-out')}, ${panelFadeCurve('zoom-out')};`
		);
	});

	it('U-12.2: a leave’s safety clock is its token and a short grace', () => {
		expect(LEAVE_GRACE_MS).toBe(50);
		expect(leaveTimeout('standard')).toBe(300);
		expect(leaveTimeout('accordion')).toBe(270);
		expect(leaveTimeout('zoom')).toBe(270);
	});

	it('U-12.2: a node moves while one of its OWN transitions runs; finished ones, animations or none do not count', () => {
		const node = document.body.appendChild(document.createElement('div'));
		expect(isMoving(node)).toBe(false);
		const runs: Partial<CSSTransition & CSSAnimation>[] = [];
		Object.defineProperty(node, 'getAnimations', { configurable: true, value: () => runs });
		runs.push({ playState: 'finished', transitionProperty: 'opacity' });
		runs.push({ playState: 'running', animationName: 'skeleton-breathe' });
		expect(isMoving(node)).toBe(false);
		runs.push({ playState: 'running', transitionProperty: 'scale' });
		expect(isMoving(node)).toBe(true);
	});

	// Rewritten from U-09.13 (the helpers took 0 ms under reduced motion): the setting changes nothing (U-12.1).
	it('U-12.1: the headless layer reads no motion setting and keeps no JS transition (U-09.13 cancelled)', () => {
		for (const name of [
			'prefersReducedMotion',
			'motionDuration',
			'overlayFade',
			'overlayPop',
			'slideFrom',
			'easings'
		]) {
			expect(name in headless, name).toBe(false);
		}
		reduceMotion();
		expect(leaveTimeout('standard')).toBe(motion.duration.standard + LEAVE_GRACE_MS);
	});
});
