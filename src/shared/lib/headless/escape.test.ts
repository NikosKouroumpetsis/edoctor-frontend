import { afterEach, describe, expect, it, vi } from 'vitest';
import { escapeKeydown } from './escape';
import { reduceMotion } from '../../../../vitest-mocks/reduce-motion';

function mountLayer() {
	const layer = document.createElement('div');
	const field = document.createElement('input');
	layer.appendChild(field);
	const elsewhere = document.createElement('button');
	document.body.append(layer, elsewhere);
	return { layer, field, elsewhere };
}

const escape = () =>
	new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

describe('escapeKeydown action', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		vi.restoreAllMocks();
	});

	it('U-03.1 (MINOR-7): closes on an Escape pressed inside the layer, and consumes it', () => {
		const { layer, field } = mountLayer();
		const onEscape = vi.fn();
		const action = escapeKeydown(layer, { onEscape });
		const event = escape();
		field.dispatchEvent(event);
		expect(onEscape).toHaveBeenCalledOnce();
		expect(event.defaultPrevented).toBe(true);
		action?.destroy?.();
	});

	it('U-03.1 (MINOR-7): ignores an Escape outside the layer (a portalled popover), one already handled, and when disabled', () => {
		const { layer, field, elsewhere } = mountLayer();
		const onEscape = vi.fn();
		const action = escapeKeydown(layer, { onEscape });
		elsewhere.dispatchEvent(escape());
		const handled = escape();
		handled.preventDefault();
		field.dispatchEvent(handled);
		action?.update?.({ onEscape, enabled: false });
		field.dispatchEvent(escape());
		field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		expect(onEscape).not.toHaveBeenCalled();
		action?.destroy?.();
		field.dispatchEvent(escape());
		expect(onEscape).not.toHaveBeenCalled();
	});

	it('U-03.1 (MINOR-7): a field that takes Escape through a document-delegated handler (Svelte `onkeydown`) keeps it', () => {
		const { layer, field } = mountLayer();
		// Svelte delegates `onkeydown` to the document before any layer opens: that handler runs first.
		const delegated = (event: KeyboardEvent) => {
			if (event.target === field) event.preventDefault();
		};
		document.addEventListener('keydown', delegated);
		const onEscape = vi.fn();
		const action = escapeKeydown(layer, { onEscape });
		field.dispatchEvent(escape());
		expect(onEscape).not.toHaveBeenCalled();
		document.removeEventListener('keydown', delegated);
		field.dispatchEvent(escape());
		expect(onEscape).toHaveBeenCalledOnce();
		action?.destroy?.();
	});

	// Rewritten from U-03.1 (NIT-7, «reads the reduced-motion preference»): no layer reads it any more (U-12.1).
	it('U-12.1: under reduced motion an Escape inside the layer still closes it, as without', () => {
		reduceMotion();
		const { layer, field } = mountLayer();
		const onEscape = vi.fn();
		const action = escapeKeydown(layer, { onEscape });
		field.dispatchEvent(escape());
		expect(onEscape).toHaveBeenCalledOnce();
		action?.destroy?.();
	});
});
