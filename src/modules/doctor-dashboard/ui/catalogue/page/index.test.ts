import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import {
	sampleCatalogueServiceId,
	sampleServicesServer,
	sampleServicesView
} from '$modules/doctor-dashboard/api/services/services.sample';
import Harness from './catalogue.harness.svelte';

/*
 * Wave 5.2 · screen 83 «Νέα υπηρεσία» (U-212.1, D-W52-81): the catalogue of the specialty WITHOUT what the doctor
 * already offers, with the server stubbed at `fetch`.
 */

function serve(start: Parameters<typeof sampleServicesServer>[0] = {}) {
	const server = sampleServicesServer(start);
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(locale: 'el' | 'en' = 'el') {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	return render(Harness, { props: { client, locale } });
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('«Νέα υπηρεσία» (wave 5.2 · screen 83)', () => {
	it('🔴 U-212.1 · D-W52-81: ONLY the catalogue of the specialty, without the services the doctor offers (`owned`), one under the other, «Συνήθως …» under each, each a link to the page of the new one — a page, never a window', async () => {
		serve();
		open();
		const rows = await screen.findByTestId('doctor-service-catalogue-rows');
		expect(screen.getByRole('heading', { name: 'Νέα υπηρεσία' })).toBeInTheDocument();
		expect(screen.getByText('Από τον κατάλογο της ειδικότητάς σας.')).toBeInTheDocument();
		const read = [...rows.querySelectorAll('li')].map((row) =>
			row.textContent?.replace(/\s+/gu, ' ').trim()
		);
		expect(read).toEqual([
			'Holter ρυθμού 24ώρου Συνήθως 20′',
			'Τεστ κοπώσεως Συνήθως 1 ώρα',
			'Βεβαίωση υγείας Συνήθως 30′'
		]);
		expect(rows.textContent).not.toMatch(
			/Απλή επίσκεψη|Επανεξέταση|Ηλεκτροκαρδιογράφημα|Υπέρηχος/u
		);
		const links = within(rows).getAllByRole('link');
		expect(links[0]).toHaveAttribute(
			'href',
			`/doctor/profile/services/new/${sampleCatalogueServiceId(5)}`
		);
		expect(screen.queryByRole('dialog')).toBeNull();
		// No price anywhere (U-217.3: the catalogue's `baseAmount` is never offered).
		expect(rows.textContent).not.toMatch(/€/u);
	});

	it('🔴 D-W52-81: every service already offered ⇒ «Έχετε ήδη όλες τις υπηρεσίες της ειδικότητάς σας.»; a failed read offers «Δοκιμάστε ξανά»', async () => {
		const server = serve();
		const all = sampleServicesView();
		server.set([
			...all,
			...[5, 6, 7].map((index) => ({
				...all[0],
				id: `0193d000-0000-7000-8000-00000000${5100 + index}`,
				serviceId: sampleCatalogueServiceId(index)
			}))
		]);
		const first = open();
		expect(await screen.findByTestId('doctor-service-catalogue-none')).toHaveTextContent(
			'Έχετε ήδη όλες τις υπηρεσίες της ειδικότητάς σας.'
		);
		first.unmount();
		server.set(sampleServicesView());
		server.refuse('GET', '/allowed-services', 500);
		server.refuse('GET', '/allowed-services', 500);
		open('en');
		const error = await screen.findByTestId('doctor-service-catalogue-error');
		expect(error).toHaveTextContent('We could not load the page.');
		screen.getByTestId('doctor-service-catalogue-retry').click();
		await waitFor(() =>
			expect(screen.getByTestId('doctor-service-catalogue-rows')).toBeInTheDocument()
		);
		expect(screen.getByRole('heading', { name: 'New service' })).toBeInTheDocument();
	});
});
