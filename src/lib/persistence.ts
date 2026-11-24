import { type XYPosition } from '@xyflow/svelte';
import type {
	IEntityDatum as PersistedEntity,
	Entity,
} from '@opensanctions/followthemoney';
import { model } from '../ftm/model';

type EntityPositions = Record<string, XYPosition>;
interface PersistedNetwork {
	version: 1;
	entities: PersistedEntity[];
	positions: EntityPositions;
}

interface Network {
	entities: Entity[];
	positions: EntityPositions;
}

// Some typechecking helpers (TODO: put into own module?)
function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isPersistedEntity(v: unknown): v is PersistedEntity {
	// At least we have an id and a schema, doesn't check the optional fields,
	// that will be checked later by trying to parse it in rehydrateEntity...
	return (
		isRecord(v) && typeof v.id === 'string' && typeof v.schema === 'string'
	);
}
function isXYPosition(v: unknown): v is XYPosition {
	return isRecord(v) && typeof v.x === 'number' && typeof v.y === 'number';
}
function isPersistedNetwork(v: unknown): v is PersistedNetwork {
	return (
		isRecord(v) &&
		v.version === 1 &&
		Array.isArray(v.entities) &&
		v.entities.every(isPersistedEntity) &&
		isRecord(v.positions) &&
		Object.values(v.positions).every(isXYPosition)
	);
}

export function loadPersistedNetwork(text: string): Network {
	// An empty text needs to be initialized.
	if (text === '') {
		return { entities: [], positions: {} };
	}
	// TODO: Better handling of invalid incoming data.
	// - try-catch in the caller (as we throw a lot here)
	// - allow an error state in NetworkState
	// - display the error in the view instead of the SvelteFlow canvas.
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('Invalid JSON while loading FtM Network');
	}
	if (!isPersistedNetwork(data)) {
		throw new Error('Detected incompatible data while loading FtM Network');
	}
	const { entities, positions }: PersistedNetwork = data;
	return { entities: entities.map((e) => rehydrateEntity(e)), positions };
}

export function serializeNetwork(network: Network): string {
	const text = JSON.stringify(toPersisted(network));
	return text;
}

// Wrapping this is a bit questionable, as it's only used in two
// places locally. But we might add error handling or change the
// format of PersistedEntity later (maybe turning it into a reference only).
function rehydrateEntity(pe: PersistedEntity): Entity {
	return model.getEntity(pe);
}

function toPersisted(network: Network): PersistedNetwork {
	return {
		version: 1,
		entities: network.entities.map((e) => e.toJSON()),
		positions: { ...network.positions },
	};
}
