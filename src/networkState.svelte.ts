import { createCardStateFromEntity, type CardState } from './entityCard';
import { type XYPosition } from '@xyflow/svelte';
import { type IEntityDatum } from '@opensanctions/followthemoney';
import { model } from './ftm';

export interface PersistedCard {
	key: string;
	entity?: IEntityDatum;
}

export interface PersistedInvestigation {
	version: 1;
	cards: PersistedCard[];
	positions: Record<string, XYPosition>;
}

// Some typechecking helpers (TODO: put into own module?)
function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isPersistedCard(v: unknown): v is PersistedCard {
	return isRecord(v) && typeof v.key === 'string';
}
function isXYPosition(v: unknown): v is XYPosition {
	return isRecord(v) && typeof v.x === 'number' && typeof v.y === 'number';
}
function isPersistedInvestigation(v: unknown): v is PersistedInvestigation {
	return (
		isRecord(v) &&
		v.version === 1 &&
		Array.isArray(v.cards) &&
		v.cards.every(isPersistedCard) &&
		isRecord(v.positions) &&
		Object.values(v.positions).every(isXYPosition)
	);
}

export class NetworkState {
	cards = $state<CardState[]>([]);
	positions = $state<Record<string, XYPosition>>({});

	load(text: string): void {
		// An empty text needs to be initialized.
		if (text === '') {
			this.cards = [];
			this.positions = {};
			return;
		}
		let data: unknown;
		try {
			data = JSON.parse(text);
		} catch {
			throw new Error('Invalid JSON while loading FtM Network');
		}
		if (!isPersistedInvestigation(data)) {
			throw new Error(
				'Detected incompatible data while loading FtM Network',
			);
		}
		const { cards, positions }: PersistedInvestigation = data;
		this.cards = cards.map((c) => this.rehydrateCard(c));
		this.positions = positions;
	}

	serialize(): string {
		const text = JSON.stringify(this.toPersisted());
		return text;
	}

	private rehydrateCard(pc: PersistedCard): CardState {
		const entity = pc.entity ? model.getEntity(pc.entity) : undefined;
		return createCardStateFromEntity(pc.key, entity);
	}

	private toPersisted(): PersistedInvestigation {
		return {
			version: 1,
			cards: this.cards.map((c) => ({
				key: c.key,
				entity: c.entity?.toJSON(),
			})),
			positions: { ...this.positions },
		};
	}
}
