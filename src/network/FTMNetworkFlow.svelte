<script lang="ts">
	import {
		SvelteFlow,
		useSvelteFlow,
		Controls,
		MiniMap,
		Background,
		BackgroundVariant,
		type XYPosition,
		type Node,
		ViewportPortal,
		type OnConnectEnd,
		type IsValidConnection,
		type OnDelete,
		type OnBeforeConnect,
		type OnSelectionChange,
		MarkerType,
	} from '@xyflow/svelte';
	import EntityNode from './EntityNode.svelte';
	import { model, linkTypes } from '../ftm/model';
	import { valueToString } from '../ftm/util';
	import type LinkType from '../ftm/LinkType';
	import type { Entity } from '@opensanctions/followthemoney';
	import type { NetworkState } from '../networkState.svelte';
	import LinkTypeChooser from './LinkTypeChooser.svelte';
	import type {
		FtMFlowNode,
		FtMFlowEdge,
		PropertyFlowEdge,
		InterstitialFlowEdge,
	} from './types';
	import InterstitialEdge from './InterstitialEdge.svelte';

	const uid = $props.id();

	let {
		network,
		onChange,
		openEntityBuilder,
		chooseEntityType,
	}: {
		network: NetworkState;
		onChange: () => void;
		openEntityBuilder: () => void;
		chooseEntityType: () => Promise<string | undefined>;
	} = $props();

	const entities = $derived(network.entities);
	const canvasPositions = $derived<Record<string, { x: number; y: number }>>(
		network.positions,
	);

	const nodeTypes = { entity: EntityNode };
	// We have three different edge types:
	// - pending (created in handleBeforeConnect)
	// - property (derived from entities in edges)
	// - interstitial (derived from entities in edges)
	// but only the last one needs a non-default component.
	const edgeTypes = { interstitial: InterstitialEdge };

	let edges = $derived.by(() => {
		const result: FtMFlowEdge[] = [];
		for (const entity of entities) {
			// interstitial edge
			if (entity.schema.isEdge && entity.schema.edge) {
				const edge = entity.schema.edge;
				for (const sourceValue of entity.getProperty(edge.source)) {
					for (const targetValue of entity.getProperty(edge.target)) {
						const sourceEntityId = valueToString(sourceValue);
						const targetEntityId = valueToString(targetValue);
						const selected = network.focusedEntity === entity.id;

						const newEdge: InterstitialFlowEdge = {
							id: `${sourceEntityId}<${entity.id}>${targetEntityId}`,
							source: sourceEntityId,
							target: targetEntityId,
							selected,
							markerEnd: {
								type: MarkerType.ArrowClosed,
								height: 20,
								width: 20,
								color: selected
									? 'var(--xy-edge-stroke-selected)'
									: 'var(--xy-edge-stroke)',
							},
							data: {
								interstitialEntityId: entity.id,
								label:
									entity.schema.edge.label ||
									entity.schema.label,
							},
							type: 'interstitial',
						};
						result.push(newEdge);
					}
				}
				// property edge
			} else {
				for (const property of entity
					.getProperties()
					.filter((p) => p.type.isEntity)) {
					const sourceEntityId = entity.id;
					if (!sourceEntityId) continue;
					for (const value of entity.getProperty(property)) {
						const targetEntityId = valueToString(value);
						if (!targetEntityId) continue;
						const newEdge: PropertyFlowEdge = {
							id: `${sourceEntityId}:${property.name}:${targetEntityId}`,
							source: sourceEntityId,
							target: targetEntityId,
							data: {
								propertyName: property.name,
							},
							type: 'property',
						};
						result.push(newEdge);
					}
				}
			}
		}
		return result;
	});

	// Nodes are a projection of the shared `entities` store. <SvelteFlow> writes
	// back into `nodes` (drag, selection, measurements); a writable $derived
	// keeps those overrides until `entities`/`canvasPositions` change, at which
	// point it recomputes. Drags persist via onNodeDragStop -> canvasPositions.
	//
	// TODO: turn this into a raw state and rather keep the entities in networkState.
	let nodes: FtMFlowNode[] = $derived.by(() =>
		entities
			.filter((e) => !e.schema.isEdge)
			.map((entity) => ({
				id: entity.id,
				type: 'entity',
				selected: network.focusedEntity === entity.id,
				position: { ...(canvasPositions[entity.id] ?? { x: 0, y: 0 }) },
				data: {
					caption: entity.getCaption(),
					schema: entity.schema,
				},
			})),
	);

	// Entities created outside the canvas (e.g. in the grid) have no position yet.
	// Lay them out in a grid below the already-positioned nodes, and persist
	// the result so they stay put rather than reflowing as other nodes move.
	const LAYOUT = { cols: 4, dx: 220, dy: 110 };

	$effect(() => {
		const unpositioned = entities.filter((e) => !canvasPositions[e.id]);
		if (unpositioned.length === 0) return;

		const placed = entities
			.map((e) => canvasPositions[e.id])
			.filter((p) => p !== undefined);
		const left = placed.length ? Math.min(...placed.map((p) => p.x)) : 0;
		const top = placed.length
			? Math.max(...placed.map((p) => p.y)) + LAYOUT.dy
			: 0;

		unpositioned.forEach((entity, i) => {
			canvasPositions[entity.id] = {
				x: left + (i % LAYOUT.cols) * LAYOUT.dx,
				y: top + Math.floor(i / LAYOUT.cols) * LAYOUT.dy,
			};
		});
		onChange();
	});

	let pendingEdgeId = $state<string | null>(null);
	type PendingSelectRelationshipType = {
		position: XYPosition;
		edgeId?: string;
		sourceId?: string;
		targetId?: string;
		linkTypes?: LinkType[];
	};
	let pendingSelectRelationshipType =
		$state<PendingSelectRelationshipType | null>(null);

	// This hook will only work if the component it's used in
	// is a child of <SvelteFlowProvider />
	const { screenToFlowPosition } = useSvelteFlow();

	async function onWrapperDblClick(event: MouseEvent) {
		// event.target will be inside .svelte-flow__pane if the click landed on empty canvas
		if (
			!(event.target as HTMLElement)?.classList.contains(
				'svelte-flow__pane',
			)
		) {
			return;
		}
		const entityType = await chooseEntityType();
		if (entityType) {
			const flowPosition = screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});
			await network.addEntityByType(entityType, flowPosition);
		}
	}

	const handleSelectionChange: OnSelectionChange<Node, FtMFlowEdge> = ({
		nodes: selectedNodes,
		edges: selectedEdges,
	}) => {
		if (selectedNodes.length === 1) {
			openEntityBuilder();
			const node = selectedNodes[0]!; // Has to exist, as we just checked nodes.length
			network.focusedEntity = node.id;
		} else if (selectedEdges.length === 1) {
			const edge = selectedEdges[0]!; // Has to exist.
			if (edge.type === 'interstitial') {
				openEntityBuilder();
				network.focusedEntity = edge.data.interstitialEntityId;
			}
		} else if (selectedNodes.length === 0 && selectedEdges.length === 0) {
			network.focusedEntity = null;
		}
	};

	// TODO: rename to handle...?
	function onNodeDragStop({ targetNode }: { targetNode: Node | null }) {
		if (!targetNode) return;
		canvasPositions[targetNode.id] = { ...targetNode.position };
		onChange();
	}

	/*
	For a new connection, I want to
	- check validity with isValidConnection => only allow those that can actually be realized
	- after adding the pending connection I want to be able to select the connection type
		- either it's an Interval, which means we'll have it's own Entity for the connection
		- or it's a simple property
	- after the user chose, I want to reflect the connection type on the FtM Entity, and I want to know what kind of connection we're dealing with
	*/
	// We start with a pending connection, then turn it into an actual persisted FtM connection

	// TODO: This maybe has to be efficiently calculated / stored,
	// as this callback can run many times while the handle is hovered.
	// As compatibility is on Schema level, it should be easy to precompute.
	const isValidConnection: IsValidConnection<FtMFlowEdge> = (connection) => {
		// 1. What is the source entity type?
		const sourceEntity = entities.find((e) => e.id === connection.source);
		if (sourceEntity === undefined) return false;
		// 2. What is the target entity type?
		const targetEntity = entities.find((e) => e.id === connection.target);
		if (targetEntity === undefined) return false;
		// 3. (What) relationships are possible in between them? => This will also be relevant later
		for (const property of sourceEntity.schema
			.getEditableProperties()
			.filter((p) => p.type.isEntity)) {
			if (targetEntity.schema.isA(property.getRange())) {
				return true;
			}
		}
		return false;
	};
	const handleBeforeConnect: OnBeforeConnect<FtMFlowEdge> = (connection) => {
		const edgeId = `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`;
		pendingEdgeId = edgeId;
		return {
			...connection,
			id: edgeId,
			markerEnd: {
				type: MarkerType.ArrowClosed,
				height: 20,
				width: 20,
			},
			animated: true,
		};
	};

	const handleConnectEnd: OnConnectEnd = (event, connectionState) => {
		if (event instanceof TouchEvent) {
			throw new Error('Mobile not supported');
		}
		if (!connectionState.isValid) {
			return;
		}
		const flowPos = screenToFlowPosition({
			x: event.clientX,
			y: event.clientY,
		});
		const sourceEntity = entities.find(
			(e) => e.id === connectionState.fromNode?.id,
		);
		if (sourceEntity === undefined) return;
		const targetEntity = entities.find(
			(e) => e.id === connectionState.toNode?.id,
		);
		if (targetEntity === undefined) return;
		const linkTypes = getLinkTypes(sourceEntity, targetEntity);
		pendingSelectRelationshipType = {
			position: flowPos,
			sourceId: sourceEntity.id,
			targetId: targetEntity.id,
			linkTypes,
		};
	};

	function getLinkTypes(source: Entity, target: Entity): LinkType[] {
		if (source && target) {
			return linkTypes.filter(
				// Note that we only offer the link types in one direction,
				// so the user is offered a different set of links depending on
				// how they're drawing the edge. Not sure if that is "good",
				// it seems to be a bit un-intuitive.
				//
				// OpenAleph has a nicer dialog for this, not sure if we should
				// try to replicate that.
				(et) => et.match(source, target),
			);
		}
		return [];
	}

	// This function is orienting itself on onEdgeCreate of OpenAleph
	// https://github.com/openaleph/openaleph/blob/f89ff18d83fcfebdadc6b2db83fb9e2fbb5397c2/ui/src/react-ftm/components/NetworkDiagram/NetworkDiagram.tsx#L261
	async function createLink(linkType: string) {
		const chosenLinkType = linkTypes.find((et) => et.key === linkType);
		if (!pendingSelectRelationshipType) {
			return;
		}
		if (chosenLinkType) {
			const sourceId = pendingSelectRelationshipType.sourceId;
			const targetId = pendingSelectRelationshipType.targetId;
			if (!sourceId || !targetId) {
				return;
			}
			if (chosenLinkType.isPropertyLinkType()) {
				network.addValue(sourceId, chosenLinkType.property!, targetId);
				// s.setProperty(chosenLinkType.property!, t.id);
			} else if (chosenLinkType.schema && chosenLinkType.schema.edge) {
				// TODO: put this creation into the hands of network as well?
				// like network.createInterstitial...
				const interstitialEntity = await model.createEntity(
					chosenLinkType.schema,
				);
				const edge = chosenLinkType.schema.edge;
				interstitialEntity.setProperty(edge.source, sourceId);
				interstitialEntity.setProperty(edge.target, targetId);
				network.addEntity(interstitialEntity);
			}
		}

		// TODO: find a better name. linkCreationCleanup?
		cancelLinkCreation();
	}

	function cancelLinkCreation() {
		// drop the pending edge
		edges = edges.filter((e) => e.id !== pendingEdgeId);
		pendingEdgeId = null;

		// then close the Dialog by resetting the state
		pendingSelectRelationshipType = null;
	}

	const handleDelete: OnDelete<Node, FtMFlowEdge> = ({
		nodes: deletedNodes,
		edges: deletedEdges,
	}) => {
		for (const node of deletedNodes) {
			network.removeEntity(node.id);
		}
		for (const edge of deletedEdges) {
			if (edge.type === 'property') {
				network.removeValue(
					edge.source,
					edge.data.propertyName,
					edge.target,
				);
			} else if (edge.type === 'interstitial') {
				network.removeEntity(edge.data.interstitialEntityId);
			}
		}
	};
</script>

<div class="workspace">
	<div class="content" ondblclick={onWrapperDblClick} role="application">
		<SvelteFlow
			id="ftm-flow-{uid}"
			bind:nodes
			bind:edges
			{nodeTypes}
			{edgeTypes}
			onselectionchange={handleSelectionChange}
			onnodedragstop={onNodeDragStop}
			{isValidConnection}
			onbeforeconnect={handleBeforeConnect}
			onconnectend={handleConnectEnd}
			ondelete={handleDelete}
			zoomOnDoubleClick={false}
			defaultMarkerColor="var(--xy-edge-stroke)"
			fitView
		>
			<ViewportPortal target="front">
				{#if pendingSelectRelationshipType && pendingSelectRelationshipType.linkTypes}
					<div
						class="nodrag nopan"
						style="position:absolute; pointer-events:all; left:{pendingSelectRelationshipType
							.position.x}px; top:{pendingSelectRelationshipType
							.position.y}px;"
					>
						<LinkTypeChooser
							linkTypes={pendingSelectRelationshipType.linkTypes}
							onSelect={createLink}
							onClose={cancelLinkCreation}
						></LinkTypeChooser>
					</div>
				{/if}
			</ViewportPortal>
			<Controls />
			<MiniMap />
			<Background variant={BackgroundVariant.Dots} gap={12} size={1} />
		</SvelteFlow>
	</div>
</div>

<style>
	.workspace {
		display: flex;
		height: 100%;
	}

	.content {
		height: 100%;
		flex: 1;
		min-width: 0;
		position: relative;
	}

	/* fixes/reverts the generic CSS reset */
	:global(.svelte-flow .svelte-flow__edges svg) {
		max-width: none;
	}
</style>
