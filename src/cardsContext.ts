import { createContext } from 'svelte';
import type { CardState } from './entityCard';

export const [getCards, setCards] = createContext<CardState[]>();
export const [getCurrentCard, setCurrentCard] =
	createContext<() => CardState>();
