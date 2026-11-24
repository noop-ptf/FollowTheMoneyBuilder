import { type XYPosition } from '@xyflow/svelte';
import type {
	IEntityDatum,
	Entity,
	Property,
} from '@opensanctions/followthemoney';
import { model } from './ftm/model';
import { valueToString } from './ftm/util';

export type PersistedEntity = IEntityDatum;
export interface PersistedNetwork {
	version: 1;
	entities: PersistedEntity[];
	positions: Record<string, XYPosition>;
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

export class NetworkState {
	entities = $state<Entity[]>([]);
	positions = $state<Record<string, XYPosition>>({});
	onChange: () => void;

	constructor(onChange: () => void) {
		this.onChange = onChange;
	}

	load(text: string): void {
		// An empty text needs to be initialized.
		if (text === '') {
			this.entities = [];
			this.positions = {};
			return;
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
			throw new Error(
				'Detected incompatible data while loading FtM Network',
			);
		}
		const { entities, positions }: PersistedNetwork = data;
		this.entities = entities.map((e) => this.rehydrateEntity(e));
		this.positions = positions;
	}

	addValue(entityId: string, property: Property, value: string) {
		const index = this.entities.findIndex((e) => e.id === entityId);
		if (index === -1) return;
		const next = this.entities[index]!.clone();
		next.setProperty(property, value);
		this.entities[index] = next;
		this.onChange();
	}
	removeValue(entityId: string, propertyName: string, value: string) {
		const index = this.entities.findIndex((e) => e.id === entityId);
		if (index === -1) return;
		const next = this.entities[index]!.clone();
		const property = next
			.getProperties()
			.find((p) => p.name === propertyName);
		if (!property) return;
		const filteredValues = next
			.getProperty(property)
			.filter((v) => v !== value);
		next.properties.delete(property);
		filteredValues.forEach((v) => next.setProperty(property, v));
		this.entities[index] = next;
		this.onChange();
	}
	setValues(entityId: string, property: Property, values: string[]) {
		const index = this.entities.findIndex((e) => e.id === entityId);
		if (index === -1) return;
		const next = this.entities[index]!.clone();
		next.properties.delete(property);
		for (const value of values) {
			if (value.trim()) {
				next.setProperty(property, value);
			}
		}
		this.entities[index] = next;
		this.onChange();
	}

	addEntity(entity: Entity, position?: XYPosition) {
		this.entities.push(entity);
		// TODO: handle undefined position. See the effect in FTMNetworkFlow.
		if (position) {
			this.positions[entity.id] = position;
		}
		this.onChange();
	}

	getEntity(entityId: string): Entity {
		const entity = this.entities.find((entity) => entity.id === entityId);
		if (entity === undefined) {
			throw new Error(
				`Could not find corresponding entity for ${entityId}`,
			);
		}
		return entity;
	}

	async addEntityByType(
		entityType: string,
		position?: XYPosition,
	): Promise<string> {
		const entity = await model.createEntity(entityType);
		this.addEntity(entity, position);
		return entity.id;
	}

	private isEdgeTouching(entity: Entity, entityId: string): boolean {
		const edge = entity.schema.edge;
		if (!entity.schema.isEdge || !edge) return false;
		return [edge.source, edge.target].some((p) =>
			entity.getProperty(p).some((v) => valueToString(v) === entityId),
		);
	}

	private references(entity: Entity, entityId: string): boolean {
		return entity
			.getProperties()
			.filter((p) => p.type.name === 'entity')
			.some((p) =>
				entity
					.getProperty(p)
					.some((v) => valueToString(v) === entityId),
			);
	}

	private withoutReference(entity: Entity, entityId: string): Entity {
		const next = entity.clone();
		entity.getProperties().forEach((p) => {
			if (p.type.name === 'entity') {
				next.properties.delete(p);
				entity
					.getProperty(p)
					.filter((v) => valueToString(v) !== entityId)
					.forEach((v) => next.setProperty(p, v));
			}
		});
		return next;
	}

	removeEntity(entityId: string) {
		this.entities = this.entities
			// 1. Filter the entity itself, as well as all interstitial entities that are referencing this entity
			.filter(
				(e) => e.id !== entityId && !this.isEdgeTouching(e, entityId),
			)
			// 2. Remove the now-stale id from other entities.
			.map((e) =>
				this.references(e, entityId)
					? this.withoutReference(e, entityId)
					: e,
			);
		delete this.positions[entityId];
		this.onChange();
	}

	getCaption(entityId: string): string {
		return (
			this.entities.find((e) => e.id === entityId)?.getCaption() ||
			'Unknown Entity'
		);
	}

	serialize(): string {
		const text = JSON.stringify(this.toPersisted());
		return text;
	}

	// Wrapping this is a bit questionable, as it's only used in two
	// places locally. But we might add error handling or change the
	// format of PersistedEntity later (maybe turning it into a reference only).
	private rehydrateEntity(pe: PersistedEntity): Entity {
		return model.getEntity(pe);
	}

	private toPersisted(): PersistedNetwork {
		return {
			version: 1,
			entities: this.entities.map((e) => e.toJSON()),
			positions: { ...this.positions },
		};
	}
}
