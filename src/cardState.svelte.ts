import type { Entity, Property, Schema } from '@opensanctions/followthemoney';

export class CardState {
	// We are using the entity id as a reference into the entities in NetworkState, so it must not change
	readonly entityId: string;
	readonly schema: Schema;
	shownProperties = $state<Property[]>([]);

	constructor(entity: Entity) {
		this.entityId = entity.id;
		this.schema = entity.schema;
		this.shownProperties = initializeShownProperties(entity);
	}

	// TODO: Addable is kind of a silly name. This is the opposite of "shownProperties".
	getAddableCardProperties(entity: Entity): Property[] {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- no need for reactivity here.
		const visible = new Set(this.visibleProperties(entity));
		return this.schema
			.getEditableProperties()
			.filter((p) => !visible.has(p));
	}

	visibleProperties(entity: Entity): Property[] {
		const withValues = entity
			.getProperties()
			.filter(
				(p) =>
					!this.shownProperties.includes(p) &&
					entity.getProperty(p).length > 0,
			);
		return [...this.shownProperties, ...withValues];
	}

	showProperty(property: Property) {
		if (!this.shownProperties.includes(property))
			this.shownProperties.push(property);
	}
	// Note: Calling this doesn't remove it from the entity, that's the caller's job.
	hideProperty(property: Property) {
		this.shownProperties = this.shownProperties.filter(
			(p) => p !== property,
		);
	}
}

// Show all featured properties and additionally those that have a value
function initializeShownProperties(entity: Entity): Property[] {
	const { featured, others } = getCardPropertiesByPriority(entity.schema);
	const othersWithValues = others.filter(
		(p) => entity.getProperty(p).length > 0,
	);
	return [...featured, ...othersWithValues];
}

export function getCardPropertiesByPriority(schema: Schema): {
	featured: Property[];
	others: Property[];
} {
	const editable = schema.getEditableProperties();
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- no need for reactivity here.
	const featuredNames = new Set(
		schema.getFeaturedProperties().map((p) => p.name),
	);
	return {
		featured: editable.filter((p) => featuredNames.has(p.name)),
		others: editable.filter((p) => !featuredNames.has(p.name)),
	};
}
