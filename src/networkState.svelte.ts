import { type XYPosition } from '@xyflow/svelte';
import type { Entity, Property } from '@opensanctions/followthemoney';
import { model } from './ftm/model';
import { isEdgeTouching, references, withoutReference } from './ftm/util';
import { loadPersistedNetwork, serializeNetwork } from './lib/persistence';

export class NetworkState {
	entities = $state<Entity[]>([]);
	positions = $state<Record<string, XYPosition>>({});
	onChange: () => void;

	constructor(onChange: () => void) {
		this.onChange = onChange;
	}

	load(text: string): void {
		const network = loadPersistedNetwork(text);
		this.entities = network.entities;
		this.positions = network.positions;
	}

	serialize(): string {
		return serializeNetwork({
			entities: this.entities,
			positions: this.positions,
		});
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

	removeEntity(entityId: string) {
		this.entities = this.entities
			// 1. Filter the entity itself, as well as all interstitial entities that are referencing this entity
			.filter((e) => e.id !== entityId && !isEdgeTouching(e, entityId))
			// 2. Remove the now-stale id from other entities.
			.map((e) =>
				references(e, entityId) ? withoutReference(e, entityId) : e,
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
}
