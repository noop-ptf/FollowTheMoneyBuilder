import type { FTMNetworkView } from '../view';
import { CardState } from './cardState.svelte';

export class BuilderState {
	networkView = $state.raw<FTMNetworkView | null>(null);
	network = $derived(this.networkView?.network);
	networkFilename = $derived(this.networkView?.file?.basename ?? null);
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- plain cache, only read and replaced inside the cards $derived; must not be reactive
	#cache = new Map<string, CardState>();
	cards = $derived.by(() => {
		// There are two scenarios in which this derived is called:
		// - a card was added to the network => then we can use most of the cached CardState except one
		// - the network was switched, then we'll regenerate everything
		const next = (this.network?.entities ?? []).map(
			(e) => this.#cache.get(e.id) ?? new CardState(e),
		);
		// Instead of detecting which of the two scenarios we've hit, it's cleanest to just recreate.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- plain cache, see above
		this.#cache = new Map(next.map((c) => [c.entityId, c]));
		return next;
	});

	attach(view: FTMNetworkView) {
		this.networkView = view;
	}

	detach(view: FTMNetworkView) {
		if (this.networkView === view) {
			this.networkView = null;
		}
	}

	rename(view: FTMNetworkView) {
		if (this.networkView === view) {
			this.networkFilename = view.file?.basename ?? null;
		}
	}
}
