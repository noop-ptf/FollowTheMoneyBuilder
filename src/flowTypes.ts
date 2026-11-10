import type { Schema } from '@opensanctions/followthemoney';
import type { Node, Edge } from '@xyflow/svelte';

// TODO: Maybe we should not pass the whole Schema, but go via string and resolve in the Node?
export type EntityNodeData = { caption: string; schema: Schema };
export type FtMFlowNode = Node<EntityNodeData, 'entity'> & {
	type: 'entity';
	data: EntityNodeData;
};

type PropertyData = { property: string };
export type PropertyFlowEdge = Edge<PropertyData, 'property'> & {
	type: 'property';
	data: PropertyData;
};
type InterstitialData = { interstitialId: string };
export type InterstitialFlowEdge = Edge<InterstitialData, 'interstitial'> & {
	type: 'interstitial';
	data: InterstitialData;
};
export type PendingFlowEdge = Edge<Record<string, never>, 'pending'>;
export type FtMFlowEdge =
	PropertyFlowEdge | InterstitialFlowEdge | PendingFlowEdge;
