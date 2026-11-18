import { createContext } from 'svelte';
import type { Entity } from '@opensanctions/followthemoney';

export const [getCurrentEntity, setCurrentEntity] =
	createContext<() => Entity>();
