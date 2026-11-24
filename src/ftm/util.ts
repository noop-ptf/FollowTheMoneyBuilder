import type { Entity, Value } from '@opensanctions/followthemoney';

// Entity-typed properties may hold Entity objects rather than strings,
// so reduce them to a string when needed.
export function valueToString(value: Value): string {
	return typeof value === 'string' ? value : value.id;
}

export function isEdgeTouching(entity: Entity, entityId: string): boolean {
	const edge = entity.schema.edge;
	if (!entity.schema.isEdge || !edge) return false;
	return [edge.source, edge.target].some((p) =>
		entity.getProperty(p).some((v) => valueToString(v) === entityId),
	);
}

export function references(entity: Entity, entityId: string): boolean {
	return entity
		.getProperties()
		.filter((p) => p.type.name === 'entity')
		.some((p) =>
			entity.getProperty(p).some((v) => valueToString(v) === entityId),
		);
}

export function withoutReference(entity: Entity, entityId: string): Entity {
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
