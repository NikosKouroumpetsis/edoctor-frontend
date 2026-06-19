# 02 — Story authoring conventions (Svelte CSF)

All stories are **Svelte CSF** (`*.stories.svelte`), co-located next to the
component. This file defines the house style + copy-paste patterns per category.

## Global rules

- **File name:** `<component>.stories.svelte` next to the component's `index.ts`.
- **Title:** explicit, grouped by atomic level:
  - primitives → `Primitives/<Name>` (e.g. `Primitives/Button`)
  - molecules → `Molecules/<Name>` (e.g. `Molecules/Text field`)
  - organisms → `Organisms/<Name>` (e.g. `Organisms/Site navbar`)
  - composed showcases → `Showcases/<Name>`
- **Autodocs:** every meta gets `tags: ['autodocs']`.
- **Controls:** expose real props via `argTypes` (selects for variants/sizes,
  booleans for states). Keep a `Playground` story driven entirely by controls.
- **Imports:** use the public barrel (`$shared/ui/primitives/<name>`), never deep
  files — stories double as usage examples.
- **A11y:** rely on the global `a11y: { test: 'error' }`. Only override per-story
  when a violation is a known, justified exception (document why).
- **State:** for interactive stories, use an instance `<script>` with `$state`
  and `bind:` inside the `{#snippet template(args)}` block.

## Pattern A — simple prop component (Button, Badge, Skeleton, Progress)

```svelte
<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Button } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Primitives/Button',
		component: Button,
		tags: ['autodocs'],
		args: { variant: 'default', size: 'default', disabled: false },
		argTypes: {
			variant: {
				control: 'select',
				options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link']
			},
			size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] },
			disabled: { control: 'boolean' }
		}
	});
</script>

<!-- Controls-driven playground -->
<Story name="Playground">
	{#snippet template(args)}
		<Button {...args}>Button</Button>
	{/snippet}
</Story>

<!-- Static gallery of every variant -->
<Story name="Variants">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			<Button>Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
		</div>
	{/snippet}
</Story>
```

## Pattern B — bindable state (Checkbox, Switch, Toggle, Slider)

```svelte
<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Checkbox } from '$shared/ui/primitives/checkbox';
	const { Story } = defineMeta({
		title: 'Primitives/Checkbox',
		component: Checkbox,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let checked = $state(false);
</script>

<Story name="Playground">
	{#snippet template(args)}
		<label class="flex items-center gap-2">
			<Checkbox bind:checked {...args} />
			<span>Accept terms — {checked ? 'yes' : 'no'}</span>
		</label>
	{/snippet}
</Story>

<Story name="States">
	{#snippet template()}
		<div class="flex gap-4">
			<Checkbox checked /><Checkbox indeterminate /><Checkbox disabled />
		</div>
	{/snippet}
</Story>
```

## Pattern C — compound / context components (Tabs, Accordion, Select, Dropdown, Card)

Compose the full part set inside the template snippet.

```svelte
<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$shared/ui/primitives/tabs';
	const { Story } = defineMeta({ title: 'Primitives/Tabs', component: Tabs, tags: ['autodocs'] });
</script>

<script lang="ts">
	let value = $state('account');
</script>

<Story name="Default">
	{#snippet template()}
		<Tabs bind:value class="w-80">
			<TabsList>
				<TabsTrigger value="account">Account</TabsTrigger>
				<TabsTrigger value="password">Password</TabsTrigger>
			</TabsList>
			<TabsContent value="account">Account panel</TabsContent>
			<TabsContent value="password">Password panel</TabsContent>
		</Tabs>
	{/snippet}
</Story>
```

For **Select / DropdownMenu**: build a trigger + content with a few items; bind
the selected value and show it. For **Card**: render Header/Title/Description/
Content/Footer with a Button.

## Pattern D — overlays (Dialog, Sheet, Popover, Tooltip, HoverCard)

Overlays portal to `<body>`. Drive them from a trigger; add a `play` function if
we want the overlay open in the docs snapshot.

```svelte
<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, within, screen } from 'storybook/test';
	import {
		Dialog,
		DialogTrigger,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription
	} from '$shared/ui/primitives/dialog';
	import { buttonVariants } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Primitives/Dialog',
		component: Dialog,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	{#snippet template()}
		<Dialog>
			<DialogTrigger class={buttonVariants()}>Open dialog</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Confirm booking</DialogTitle>
					<DialogDescription>Confirm your appointment.</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	{/snippet}
</Story>

<!-- Interaction test: opens the dialog and asserts it is shown -->
<Story
	name="Opened"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Open dialog' }));
		await expect(await screen.findByRole('dialog')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<Dialog>
			<DialogTrigger class={buttonVariants()}>Open dialog</DialogTrigger>
			<DialogContent><DialogHeader><DialogTitle>Confirm</DialogTitle></DialogHeader></DialogContent>
		</Dialog>
	{/snippet}
</Story>
```

> `play` functions become assertions when run through `@storybook/addon-vitest`,
> mirroring our existing Vitest specs. We already have equivalent jsdom tests, so
> for overlays a single `Opened` play story per overlay is enough — don't
> duplicate the whole jsdom suite.

## Pattern E — form-field molecules (standalone + form-connected)

Show both modes our fields support: standalone `bind:value` and `createForm` field.

```svelte
<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { TextField } from '$shared/ui/molecules/text-field';
	const { Story } = defineMeta({
		title: 'Molecules/Text field',
		component: TextField,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	import { createForm, Validators } from '$shared/lib/form';
	let value = $state('');
	const form = createForm({
		initialValues: { email: '' },
		validators: { email: [Validators.required, Validators.email] }
	});
</script>

<Story name="Standalone">
	{#snippet template()}
		<TextField label="Email" bind:value type="email" />
	{/snippet}
</Story>

<Story name="With error">
	{#snippet template()}
		<TextField label="Email" value="bad" error="Enter a valid email address" />
	{/snippet}
</Story>

<Story name="Form-connected (blur to validate)">
	{#snippet template()}
		<TextField label="Email" field={form.field('email')} type="email" />
	{/snippet}
</Story>
```

## Pattern F — composed showcase (Forms/Registration)

A single `Showcases/Registration` story that builds the full registration form
with `createForm` + every field molecule (text/password/number/phone/dob/
single/multi-selection) and a submit button rendering the collected values.
This is the component-level analogue of the `/test-components` Forms section —
**not** doctor-specific, so it's in scope. Reuse the markup from
`src/screens/test-components/components/sections/forms.svelte` (without the demo
chrome).

## Notes specific to our components

- **Icons:** `~icons/lucide/*` virtual imports work in Storybook (our vite config
  is reused). Use them in stories as in the app.
- **i18n:** `theme-toggle` / `language-switcher` read `$app/state` & `$paraglide`
  — these resolve under `@storybook/sveltekit`. If a story needs a specific
  locale, set `page.url` via a story decorator.
- **Dark mode:** never hard-code colors; rely on semantic tokens so the toolbar
  theme switch (preview decorator) recolors every story.
