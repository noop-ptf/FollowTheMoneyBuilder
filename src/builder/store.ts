import { writable, get, type Readable } from 'svelte/store';

export type ResourceStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ResourceState<T> {
	data: T | null;
	status: ResourceStatus;
	error: unknown;
	lastFetchedAt: number | null;
}

export interface ResourceOptions {
	/** Milliseconds before cached data is considered stale. Default 60000. */
	ttl?: number;
}

export interface Resource<T> extends Readable<ResourceState<T>> {
	/** Fetch only if there's no data yet or the cache has gone stale. */
	load: () => Promise<T>;
	/** Force a refetch right now, regardless of TTL. */
	refresh: () => Promise<T>;
	/** Mark the cache stale without touching current data or triggering a fetch. */
	invalidate: () => void;
}

/**
 * Creates a stale-while-revalidate resource store.
 *
 * Usage:
 *   const users = createResource<User[]>(() => fetch('/api/users').then(r => r.json()));
 *   users.subscribe(state => console.log(state));
 *   users.load();          // fetch if stale or empty
 *   users.invalidate();    // force refetch next load()
 *   users.refresh();       // refetch immediately, ignoring TTL
 */
export function createResource<T>(
	fetcher: () => Promise<T>,
	options: ResourceOptions = {},
): Resource<T> {
	const ttl = options.ttl ?? 60_000;

	const store = writable<ResourceState<T>>({
		data: null,
		status: 'idle',
		error: null,
		lastFetchedAt: null,
	});

	let inFlight: Promise<T> | null = null; // dedupe concurrent calls

	function isStale(state: ResourceState<T>): boolean {
		if (state.lastFetchedAt === null) return true;
		return Date.now() - state.lastFetchedAt > ttl;
	}

	async function runFetch(): Promise<T> {
		// Keep existing data visible while revalidating (the "stale" part of SWR).
		store.update((s) => ({ ...s, status: 'loading', error: null }));

		try {
			const data = await fetcher();
			store.set({
				data,
				status: 'success',
				error: null,
				lastFetchedAt: Date.now(),
			});
			return data;
		} catch (error) {
			store.update((s) => ({ ...s, status: 'error', error }));
			throw error;
		} finally {
			inFlight = null;
		}
	}

	function load(): Promise<T> {
		const state = get(store);
		if (
			state.status === 'success' &&
			!isStale(state) &&
			state.data !== null
		) {
			return Promise.resolve(state.data);
		}
		if (inFlight) return inFlight; // avoid duplicate requests
		inFlight = runFetch();
		return inFlight;
	}

	function refresh(): Promise<T> {
		if (inFlight) return inFlight;
		inFlight = runFetch();
		return inFlight;
	}

	function invalidate(): void {
		store.update((s) => ({ ...s, lastFetchedAt: null }));
	}

	return {
		subscribe: store.subscribe,
		load,
		refresh,
		invalidate,
	};
}
