<script lang="ts" module>
	export type SelectVariant = 'field' | 'pill';
	export type SelectSize = 'default' | 'lg';

	// The application's `Select` trigger (`molecules/select`): the form field, or a content-width pill.
	const triggerSizes: Record<SelectVariant, Record<SelectSize, string>> = {
		field: {
			default: 'min-h-control-md w-full rounded-md px-3.5',
			lg: 'min-h-control-lg w-full rounded-md px-3.5'
		},
		pill: {
			default: 'min-h-touch min-w-touch w-fit rounded-full px-4',
			lg: 'min-h-control-lg min-w-touch w-fit rounded-full px-4'
		}
	};
	const valueSizes: Record<SelectVariant, Record<SelectSize, string>> = {
		field: { default: 'flex-1 text-body-md', lg: 'flex-1 text-body-lg' },
		pill: { default: 'text-body-sm font-semibold', lg: 'text-body-md font-semibold' }
	};
	/** The pill is content, not an input, so it borrows the content border. */
	const borders: Record<SelectVariant, string> = { field: 'border-input', pill: 'border-border' };
</script>

<script lang="ts">
	import { SelectRoot, SelectTrigger } from '$shared/ui/primitives/select';
	import { cn } from '$shared/lib/utils';
	import SelectOptions, { type SelectOption } from './select-options.svelte';

	let {
		options,
		value = $bindable(),
		onChange,
		placeholder,
		variant = 'field',
		size = 'default',
		searchable = false,
		searchPlaceholder,
		invalid = false,
		disabled = false,
		name,
		id,
		'aria-label': ariaLabel,
		'aria-labelledby': ariaLabelledby,
		'aria-describedby': ariaDescribedby,
		'data-testid': testId,
		class: className
	}: {
		options: SelectOption[];
		value?: string;
		/** The application's callback: the chosen value, after `bind:value` took it. */
		onChange?: (value: string) => void;
		/** The resting words, already localized by the caller. */
		placeholder: string;
		variant?: SelectVariant;
		size?: SelectSize;
		/** A search field at the top of the list; its placeholder is then required. */
		searchable?: boolean;
		searchPlaceholder?: string;
		invalid?: boolean;
		disabled?: boolean;
		name?: string;
		id?: string;
		/** The trigger's name when no label points at it (the application's `triggerAccessibilityLabel`). */
		'aria-label'?: string;
		'aria-labelledby'?: string;
		'aria-describedby'?: string;
		'data-testid'?: string;
		class?: string;
	} = $props();

	const chosen = $derived(options.find((option) => option.value === value));
</script>

<div data-slot="select" class={cn(variant === 'field' && 'w-full', className)}>
	<SelectRoot bind:value {disabled} {name} onValueChange={(next) => onChange?.(next)}>
		<SelectTrigger
			{id}
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledby}
			aria-describedby={ariaDescribedby}
			aria-invalid={invalid || undefined}
			data-testid={testId}
			data-variant={variant}
			class={cn(
				'flex-row justify-between gap-2 border bg-card',
				triggerSizes[variant][size],
				invalid ? 'border-danger' : borders[variant]
			)}
		>
			<span
				class={cn(
					'min-w-0 truncate text-start',
					valueSizes[variant][size],
					chosen ? 'text-foreground' : 'text-muted-foreground'
				)}
			>
				{chosen?.label ?? placeholder}
			</span>
		</SelectTrigger>
		<SelectOptions
			{options}
			{value}
			searchPlaceholder={searchable ? searchPlaceholder : undefined}
		/>
	</SelectRoot>
</div>
