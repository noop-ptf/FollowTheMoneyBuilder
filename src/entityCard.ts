import type { Entity, Property, Schema } from '@opensanctions/followthemoney';
import { model } from './ftm';

export interface AddedProperty {
	property: Property;
	values: string[];
}

export interface CardState {
	key: string; // stable id for #each/DnD; independent of entity.id
	entity: Entity | undefined; // created lazily once a schema is first chosen
	addedProps: AddedProperty[]; // both featured-toggled and "+more"-added properties
	autofocus: boolean; // true only for the card just created via the ghost tile
	editing: boolean; // true, when we're currently editing
}

export function createCardState(autofocus = false): CardState {
	return createCardStateFromEntity(
		model.generateRandomId(),
		undefined,
		autofocus,
		true,
	);
}

// Canonical constructor: builds a CardState from an (optional) entity,
//  This is the "recreate CardState on mount" seam — a later persistence pass persists
// Entity objects and always rebuilds a CardState from one via this function,
// rather than persisting/syncing a parallel copy of its fields.
export function createCardStateFromEntity(
	key: string,
	entity: Entity | undefined,
	autofocus = false,
	editing = true,
): CardState {
	return {
		key,
		entity,
		addedProps: entity ? buildAddedPropsFromEntity(entity) : [],
		autofocus,
		editing,
	};
}

export function getCardProperties(schema: Schema): {
	featured: Property[];
	others: Property[];
} {
	const editable = schema
		.getEditableProperties()
		.filter((p) => p.type.name !== 'entity');
	const featuredNames = new Set(
		schema.getFeaturedProperties().map((p) => p.name),
	);
	return {
		featured: editable.filter((p) => featuredNames.has(p.name)),
		others: editable.filter((p) => !featuredNames.has(p.name)),
	};
}

// Re-derives one added property's values onto entity. Call from a scope that
// reads only this ap.values (+ entity), so a keystroke in this field never
// touches any other property's Map entry.
export function syncProperty(entity: Entity, ap: AddedProperty): void {
	entity.properties.delete(ap.property);
	for (const v of ap.values) {
		if (v.trim().length > 0) entity.setProperty(ap.property, v);
	}
}

export function buildAddedPropsFromEntity(entity: Entity): AddedProperty[] {
	const { featured, others } = getCardProperties(entity.schema);
	return [...featured, ...others]
		.map((property) => ({
			property,
			values: entity.getProperty(property) as string[],
		}))
		.filter((ap) => ap.values.length > 0);
}
