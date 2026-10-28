import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Harness from './section.harness.svelte';

describe('Section and SectionHeader', () => {
	it('U-03.1 (K2.4): plain is the rails’ header — title 20 → 22 from the tablet, bold, subtitle body-md muted, 14 to the body', () => {
		render(Harness, { props: { subtitle: 'Κοντά σας' } });
		const section = screen.getByTestId('section');
		expect(section.tagName).toBe('SECTION');
		expect(section).toHaveClass('flex', 'flex-col', 'gap-3.5');
		const title = screen.getByRole('heading', { level: 2, name: 'Τοποθεσία' });
		expect(title).toHaveClass(
			'text-title-lg',
			'tablet:text-heading-sm',
			'font-bold',
			'text-foreground'
		);
		expect(screen.getByText('Κοντά σας')).toHaveClass('text-body-md', 'text-muted-foreground');
		expect(section).not.toHaveClass('border-t');
	});

	it('U-03.1 (K2.4): ruled draws the 60 % hairline and pt-section above a title-lg bold, unless showRule is off', () => {
		const view = render(Harness, { props: { variant: 'ruled' } });
		const section = screen.getByTestId('section');
		expect(section).toHaveClass('gap-5', 'border-t', 'border-border/60', 'pt-section');
		const title = screen.getByRole('heading', { name: 'Τοποθεσία' });
		expect(title).toHaveClass('text-title-lg', 'font-bold');
		expect(title).not.toHaveClass('tablet:text-heading-sm');
		view.unmount();
		render(Harness, { props: { variant: 'ruled', showRule: false } });
		expect(screen.getByTestId('section')).not.toHaveClass('border-t', 'pt-section');
	});

	it('U-03.1 (K2.4): divided puts a Divider (mb-1) before a title-xs semibold and a body-sm subtitle, 12 apart', () => {
		const view = render(Harness, { props: { variant: 'divided', subtitle: 'Ανά επίσκεψη' } });
		const section = screen.getByTestId('section');
		expect(section).toHaveClass('gap-3');
		const divider = section.firstElementChild;
		expect(divider).toHaveAttribute('data-slot', 'divider');
		expect(divider).toHaveClass('border-t', 'border-border/60', 'mb-1');
		expect(screen.getByRole('heading', { name: 'Τοποθεσία' })).toHaveClass(
			'text-title-xs',
			'font-semibold'
		);
		expect(screen.getByText('Ανά επίσκεψη')).toHaveClass('text-body-sm', 'text-muted-foreground');
		view.unmount();
		render(Harness, { props: { variant: 'divided', showRule: false } });
		expect(
			screen.getByTestId('section').querySelector('[data-slot="divider"]')
		).not.toBeInTheDocument();
	});

	it('U-03.1 (K2.4): the heading level is the page’s, the trailing control sits at the header’s end', () => {
		render(Harness, { props: { headingAs: 'h3', withTrailing: true } });
		expect(screen.getByRole('heading', { level: 3, name: 'Τοποθεσία' })).toBeInTheDocument();
		const header = screen
			.getByRole('heading', { level: 3 })
			.closest('[data-slot="section-header"]');
		expect(header).toHaveClass('flex-row', 'items-start', 'justify-between', 'gap-4');
		expect(header?.lastElementChild).toHaveTextContent('Όλα');
	});

	it('U-03.1 (K2.4): without a title or subtitle there is no header, only the body', () => {
		render(Harness, { props: { title: '' } });
		const section = screen.getByTestId('section');
		expect(section.querySelector('[data-slot="section-header"]')).toBeNull();
		expect(screen.queryByRole('heading')).not.toBeInTheDocument();
		expect(screen.getByText('Σώμα')).toBeInTheDocument();
	});

	it('R5-6: each look draws what the application’s draws — ruled its title alone, divided no control, plain all', () => {
		const ruled = render(Harness, {
			props: { variant: 'ruled', subtitle: 'Γραμμή', withTrailing: true }
		});
		expect(ruled.getByRole('heading', { name: 'Τοποθεσία' })).toBeInTheDocument();
		expect(ruled.queryByText('Γραμμή')).toBeNull();
		expect(ruled.queryByRole('button', { name: 'Όλα' })).toBeNull();
		ruled.unmount();
		const divided = render(Harness, {
			props: { variant: 'divided', subtitle: 'Γραμμή', withTrailing: true }
		});
		expect(divided.getByText('Γραμμή')).toBeInTheDocument();
		expect(divided.queryByRole('button', { name: 'Όλα' })).toBeNull();
		divided.unmount();
		const plain = render(Harness, {
			props: { variant: 'plain', subtitle: 'Γραμμή', withTrailing: true }
		});
		expect(plain.getByText('Γραμμή')).toBeInTheDocument();
		expect(plain.getByRole('button', { name: 'Όλα' })).toBeInTheDocument();
	});
});
