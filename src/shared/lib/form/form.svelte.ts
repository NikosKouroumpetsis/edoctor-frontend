/**
 * `createForm` — a tiny, runes-based form controller in the spirit of React
 * Hook Form, with zero dependencies.
 *
 * Reactivity is fine-grained: each field reads `values[name]`/`errors[name]`
 * from `$state` records, so typing in one field only re-renders that field's
 * consumers — never its siblings. Connect a field to an input via
 * `form.field(name)` (returns a stable accessor with value/error/handlers).
 */
import { runValidators, defaultMessages, type ValidatorFn } from './validators';

export type FieldValues = Record<string, unknown>;

export interface FormConfig<T extends FieldValues> {
	initialValues: T;
	/** Per-field validator lists. */
	validators?: Partial<Record<keyof T & string, ValidatorFn[]>>;
	/** Per-field message overrides, keyed by validator error key. */
	messages?: Partial<Record<keyof T & string, Record<string, string>>>;
	/** Re-validate a touched field on every input (default true) or only on blur. */
	validateOnInput?: boolean;
	onSubmit?: (values: T) => void | Promise<void>;
}

export interface FieldApi<V = unknown> {
	readonly name: string;
	readonly value: V;
	readonly error: string | undefined;
	readonly touched: boolean;
	readonly dirty: boolean;
	setValue: (value: V) => void;
	handleInput: (event: Event) => void;
	handleBlur: () => void;
}

export class FormController<T extends FieldValues> {
	values = $state<T>({} as T);
	errors = $state<Partial<Record<keyof T & string, string>>>({});
	touched = $state<Partial<Record<keyof T & string, boolean>>>({});
	isSubmitting = $state(false);
	submitCount = $state(0);

	#initial: T;
	#config: FormConfig<T>;
	// Plain (non-reactive) cache of stable field accessors keyed by name.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#fieldCache = new Map<string, FieldApi>();

	constructor(config: FormConfig<T>) {
		this.#config = config;
		this.#initial = { ...config.initialValues };
		this.values = { ...config.initialValues };
	}

	get isDirty(): boolean {
		return (Object.keys(this.values) as (keyof T & string)[]).some(
			(k) => this.values[k] !== this.#initial[k]
		);
	}

	/** Whether the form currently has no recorded errors. */
	get isValid(): boolean {
		return Object.values(this.errors).every((e) => !e);
	}

	#messageFor(name: keyof T & string, key: string): string {
		return this.#config.messages?.[name]?.[key] ?? defaultMessages[key] ?? key;
	}

	/** Validate a single field, update `errors`, and return its message (or undefined). */
	validateField(name: keyof T & string): string | undefined {
		const validators = this.#config.validators?.[name];
		if (!validators || validators.length === 0) {
			this.errors[name] = undefined;
			return undefined;
		}
		const error = runValidators(this.values[name], validators);
		const message = error ? this.#messageFor(name, Object.keys(error)[0]) : undefined;
		this.errors[name] = message;
		return message;
	}

	/** Validate all configured fields. Returns true when the form is valid. */
	validate(): boolean {
		let valid = true;
		for (const name of Object.keys(this.#config.validators ?? {}) as (keyof T & string)[]) {
			if (this.validateField(name)) valid = false;
		}
		return valid;
	}

	setValue<K extends keyof T & string>(name: K, value: T[K]): void {
		this.values[name] = value;
		if (this.touched[name] && this.#config.validateOnInput !== false) this.validateField(name);
	}

	setTouched(name: keyof T & string, touched = true): void {
		this.touched[name] = touched;
	}

	reset(): void {
		this.values = { ...this.#initial };
		this.errors = {};
		this.touched = {};
		this.submitCount = 0;
	}

	async handleSubmit(event?: SubmitEvent): Promise<void> {
		event?.preventDefault();
		this.submitCount += 1;
		for (const name of Object.keys(this.values) as (keyof T & string)[]) this.touched[name] = true;
		if (!this.validate()) return;
		try {
			this.isSubmitting = true;
			await this.#config.onSubmit?.(this.values);
		} finally {
			this.isSubmitting = false;
		}
	}

	/** Stable per-field accessor for binding to an input. */
	field<K extends keyof T & string>(name: K): FieldApi<T[K]> {
		const cached = this.#fieldCache.get(name);
		if (cached) return cached as FieldApi<T[K]>;

		// Alias for the accessor getters/closures below (object-literal `this`
		// would otherwise shadow the controller instance).
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;
		const api: FieldApi<T[K]> = {
			name,
			get value() {
				return self.values[name];
			},
			get error() {
				return self.errors[name];
			},
			get touched() {
				return self.touched[name] ?? false;
			},
			get dirty() {
				return self.values[name] !== self.#initial[name];
			},
			setValue(value) {
				self.setValue(name, value);
			},
			handleInput(event) {
				const target = event.target as HTMLInputElement;
				const value = target.type === 'checkbox' ? target.checked : target.value;
				self.setValue(name, value as T[K]);
			},
			handleBlur() {
				self.setTouched(name);
				self.validateField(name);
			}
		};
		this.#fieldCache.set(name, api as FieldApi);
		return api;
	}
}

export function createForm<T extends FieldValues>(config: FormConfig<T>): FormController<T> {
	return new FormController(config);
}
