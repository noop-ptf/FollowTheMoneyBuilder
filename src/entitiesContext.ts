import { createContext } from 'svelte';
import type { Entity } from '@opensanctions/followthemoney';
import type { NetworkState } from './networkState.svelte';

export const [getNetwork, setNetwork] =
	createContext<() => NetworkState | undefined>();
export const [getCurrentEntity, setCurrentEntity] =
	createContext<() => Entity>();
