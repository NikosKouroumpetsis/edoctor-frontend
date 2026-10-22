import { describe, expect, it } from 'vitest';
import { cn, tv } from './utils';

describe('cn', () => {
	it('keeps a text role next to a text colour', () => {
		expect(cn('text-body-sm text-muted-foreground')).toBe('text-body-sm text-muted-foreground');
	});

	it('lets the later named size win within the same property', () => {
		expect(cn('p-4 p-card')).toBe('p-card');
		expect(cn('rounded-md rounded-xl')).toBe('rounded-xl');
		expect(cn('h-touch h-control-lg')).toBe('h-control-lg');
		expect(cn('min-h-touch min-h-control-md')).toBe('min-h-control-md');
		expect(cn('size-touch size-control-md')).toBe('size-control-md');
		expect(cn('max-w-form max-w-page')).toBe('max-w-page');
		expect(cn('w-card-rail-w w-full')).toBe('w-full');
		expect(cn('gap-touch-gap gap-2')).toBe('gap-2');
		expect(cn('tablet:px-gutter-sm tablet:px-gutter-md')).toBe('tablet:px-gutter-md');
		expect(cn('text-body-sm text-title-lg')).toBe('text-title-lg');
		expect(cn('leading-flat leading-relaxed')).toBe('leading-relaxed');
	});

	it('drops a leading written before the role, so the leading always comes after it', () => {
		expect(cn('leading-tight text-body-sm')).toBe('text-body-sm');
		expect(cn('text-body-sm leading-tight')).toBe('text-body-sm leading-tight');
	});

	it('keeps an elevation next to a shadow colour', () => {
		expect(cn('shadow-raised shadow-primary/20')).toBe('shadow-raised shadow-primary/20');
	});
});

describe('tv', () => {
	it('merges recipes with the same size names as cn', () => {
		const recipe = tv({
			base: 'p-4 text-body-sm text-muted-foreground',
			variants: { size: { lg: 'p-card min-h-control-lg' } }
		});
		expect(recipe()).toBe('p-4 text-body-sm text-muted-foreground');
		expect(recipe({ size: 'lg' })).toBe(
			'text-body-sm text-muted-foreground p-card min-h-control-lg'
		);
		expect(recipe({ class: 'text-title-lg' })).toBe('p-4 text-muted-foreground text-title-lg');
	});
});
