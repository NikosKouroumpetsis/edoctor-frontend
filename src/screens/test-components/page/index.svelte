<script lang="ts">
	import Buttons from '../components/sections/buttons.svelte';
	import TextInputs from '../components/sections/text-inputs.svelte';
	import SelectionControls from '../components/sections/selection-controls.svelte';
	import Toggles from '../components/sections/toggles.svelte';
	import TabsAccordion from '../components/sections/tabs-accordion.svelte';
	import Display from '../components/sections/display.svelte';
	import Overlays from '../components/sections/overlays.svelte';
	import SelectMenu from '../components/sections/select-menu.svelte';
	import CommandCalendar from '../components/sections/command-calendar.svelte';
	import Forms from '../components/sections/forms.svelte';
	import Domain from '../components/sections/domain.svelte';

	// In-page navigation. Each phase appends its sections here.
	const groups: { label: string; items: { id: string; label: string }[] }[] = [
		{
			label: 'Forms & inputs',
			items: [
				{ id: 'buttons', label: 'Button' },
				{ id: 'text-inputs', label: 'Input + Label' },
				{ id: 'selection-controls', label: 'Checkbox · Switch · Radio' },
				{ id: 'toggles', label: 'Toggle · Toggle group' },
				{ id: 'select-menu', label: 'Select · Dropdown menu' }
			]
		},
		{
			label: 'Forms',
			items: [{ id: 'forms', label: 'Form system & fields' }]
		},
		{
			label: 'Disclosure & range',
			items: [{ id: 'tabs-accordion', label: 'Tabs · Accordion · Slider' }]
		},
		{
			label: 'Overlays',
			items: [
				{ id: 'overlays', label: 'Dialog · Sheet · Popover · Tooltip' },
				{ id: 'command-calendar', label: 'Combobox · Calendar · Date picker' }
			]
		},
		{
			label: 'Display',
			items: [{ id: 'display', label: 'Display & content' }]
		},
		{
			label: 'Domain',
			items: [{ id: 'domain', label: 'Domain components' }]
		}
	];
</script>

<div class="container-page py-section">
	<header class="mb-section">
		<p class="text-label-md tracking-wide text-muted-foreground uppercase">eDoctor</p>
		<h1 class="text-display-sm">Component gallery</h1>
		<p class="mt-2 max-w-2xl text-body-md text-muted-foreground">
			Live showcase of the in-house, shadcn-styled component system. Every primitive here is built
			on our own headless layer — no external UI libraries.
		</p>
	</header>

	<div class="gap-section lg:grid lg:grid-cols-[210px_1fr]">
		<nav class="mb-8 lg:sticky lg:top-24 lg:mb-0 lg:self-start" aria-label="Component sections">
			{#each groups as group (group.label)}
				<p class="mb-2 text-label-md tracking-wide text-muted-foreground uppercase">
					{group.label}
				</p>
				<ul class="mb-4 space-y-1">
					{#each group.items as item (item.id)}
						<li>
							<a
								href={`#${item.id}`}
								class="block rounded-md px-2 py-1 text-body-sm text-muted-foreground hover:bg-muted hover:text-foreground"
							>
								{item.label}
							</a>
						</li>
					{/each}
				</ul>
			{/each}
		</nav>

		<main class="min-w-0 space-y-section">
			<Buttons />
			<TextInputs />
			<SelectionControls />
			<Toggles />
			<SelectMenu />
			<Forms />
			<TabsAccordion />
			<Overlays />
			<CommandCalendar />
			<Display />
			<Domain />
		</main>
	</div>
</div>
