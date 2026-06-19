import { getContext, setContext } from 'svelte';

/**
 * Typed component context factory.
 *
 * Mirrors the ergonomics of the legacy Vue `createContext` helper but on top of
 * Svelte's `setContext`/`getContext`. Returns a `[get, set]` tuple keyed by a
 * unique `Symbol`, so two unrelated primitives never collide.
 *
 * @example
 *   type AccordionCtx = { value: () => string | null };
 *   const [getAccordionCtx, setAccordionCtx] = createContext<AccordionCtx>('Accordion');
 */
export function createContext<T>(name: string) {
	const key = Symbol(name);

	function set(value: T): T {
		setContext(key, value);
		return value;
	}

	/**
	 * @throws when called outside a component that ran the matching `set`.
	 */
	function get(): T {
		const ctx = getContext<T | undefined>(key);
		if (ctx === undefined) {
			throw new Error(
				`[${name}] context is missing — render this component inside its <${name}> root.`
			);
		}
		return ctx;
	}

	function getOptional(): T | undefined {
		return getContext<T | undefined>(key);
	}

	return [get, set, getOptional] as const;
}
