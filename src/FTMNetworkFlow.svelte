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
	} from '@xyflow/svelte';
	import EntityNode from './EntityNode.svelte';
	import PendingEdge from './PendingEdge.svelte';
	import ContextPanel from './ContextPanel.svelte';
	import { createCardStateFromEntity } from './entityCard';
	import { listEntitySchemata, model, valueToString, linkTypes } from './ftm';
	import type LinkType from './LinkType';
	import type { Entity } from '@opensanctions/followthemoney';
	import EntityEditor from './EntityEditor.svelte';
	import type { NetworkState } from './networkState.svelte';
	import LinkTypeChooser from './LinkTypeChooser.svelte';
	import type {
		FtMFlowNode,
		FtMFlowEdge,
		PropertyFlowEdge,
	} from './flowTypes';

	const uid = $props.id();

	let {
		network,
		onChange,
	}: {
		network: NetworkState;
		onChange: () => void;
	} = $props();

	const entities = $derived(network.entities);
	const canvasPositions = $derived<Record<string, { x: number; y: number }>>(
		network.positions,
	);

	const nodeTypes = { entity: EntityNode };
	// TODO: pending connection: Indicate that we're still working on that one.
	const edgeTypes = { pending: PendingEdge };
	const schemata = listEntitySchemata();

	let edgesVersion = $state(0);
	let edges = $derived.by(() => {
		edgesVersion;
		const result: FtMFlowEdge[] = [];
		for (const entity of entities) {
			for (const property of entity
				.getProperties()
				.filter((p) => p.type.isEntity)) {
				const sourceEntityId = entity.id;
				if (!sourceEntityId) continue;
				for (const value of entity.getProperty(property)) {
					const targetEntityId = valueToString(value);
					if (!targetEntityId) continue;
					const newEdge: PropertyFlowEdge = {
						// TODO: this ID is not enough, as there can be multiple edges between source and target
						id: `${sourceEntityId}:${property.name}:${targetEntityId}`,
						source: sourceEntityId,
						target: targetEntityId,
						data: {
							property: property.name,
						},
						type: 'property',
					};
					result.push(newEdge);
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
		entities.map((entity) => ({
			id: entity.id,
			type: 'entity',
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
	});

	let pendingInput = $state<{ flowPos: XYPosition } | null>(null);
	let pendingEdgeId = $state<string | null>(null);
	type PendingSelectRelationshipType = {
		position: XYPosition;
		edgeId?: string;
		source?: Entity;
		target?: Entity;
		linkTypes?: LinkType[];
	};
	let pendingSelectRelationshipType =
		$state<PendingSelectRelationshipType | null>(null);
	let inputEl = $state<HTMLInputElement>();

	// A direct reference into `entities`, so sidebar edits flow to the node face
	// (and the grid, and storage) without any writeback.
	let selectedEntity = $state<Entity | null>(null);

	// This hook will only work if the component it's used in
	// is a child of <SvelteFlowProvider />
	const { screenToFlowPosition } = useSvelteFlow();

	function onWrapperDblClick(event: MouseEvent) {
		// event.target will be inside .svelte-flow__pane if the click landed on empty canvas
		if (
			!(event.target as HTMLElement)?.classList.contains(
				'svelte-flow__pane',
			)
		) {
			return;
		}
		const flowPos = screenToFlowPosition({
			x: event.clientX,
			y: event.clientY,
		});
		pendingInput = { flowPos };
	}

	// focus the input as soon as it exists in the DOM
	$effect(() => {
		if (pendingInput && inputEl) inputEl.focus();
	});

	function commit() {
		// Enter commits and clears pendingInput, which unmounts the input and
		// fires a blur — guard so that trailing blur-commit doesn't run again.
		if (!pendingInput) return;
		// TODO: create an entity here
		pendingInput = null;
		onChange();
	}

	function onKeydown(
		event: KeyboardEvent & { currentTarget: HTMLInputElement },
	) {
		if (event.key === 'Enter') commit();
		if (event.key === 'Escape') pendingInput = null;
	}

	// TODO: rename to handle...?
	function onNodeClick({ node }: { node: Node }) {
		if (node.type !== 'entity') return;
		selectedEntity = entities.find((e) => e.id === node.id) ?? null;
	}

	function closeSidebar() {
		selectedEntity = null;
	}

	function deleteSelectedNode() {
		if (!selectedEntity) return;
		const index = entities.findIndex((e) => e.id === selectedEntity?.id);
		if (index !== -1) entities.splice(index, 1);
		delete canvasPositions[selectedEntity.id];
		closeSidebar();
		onChange();
	}

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
			type: 'pending',
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
			source: sourceEntity,
			target: targetEntity,
			linkTypes,
		};
	};

	function getLinkTypes(source: Entity, target: Entity): LinkType[] {
		if (source && target) {
			return linkTypes.filter(
				(et) => et.match(source, target) || et.match(target, source),
			);
		}
		return [];
	}

	// This function is orienting itself on onEdgeCreate of OpenAleph
	// https://github.com/openaleph/openaleph/blob/f89ff18d83fcfebdadc6b2db83fb9e2fbb5397c2/ui/src/react-ftm/components/NetworkDiagram/NetworkDiagram.tsx#L261
	async function createLink(linkType: string) {
		// TODO: set the Edge in the Entity data

		const chosenLinkType = linkTypes.find((et) => et.key === linkType);
		if (!pendingSelectRelationshipType) {
			return;
		}
		if (chosenLinkType) {
			const s = pendingSelectRelationshipType.source;
			const t = pendingSelectRelationshipType.target;
			if (!s || !t) {
				return;
			}
			if (chosenLinkType.isPropertyLinkType()) {
				s.setProperty(chosenLinkType.property!, t.id);
			} else if (chosenLinkType.schema && chosenLinkType.schema.edge) {
				const interstitialEntity = await model.createEntity(
					chosenLinkType.schema,
				);
				const edge = chosenLinkType.schema.edge;
				interstitialEntity.setProperty(edge.source, s.id);
				interstitialEntity.setProperty(edge.target, t.id);
				entities.push(interstitialEntity);
			}
		}

		// drop the pending edge
		edges = edges.filter((e) => e.id !== pendingEdgeId);
		pendingEdgeId = null;

		// then close the Dialog by resetting the state
		pendingSelectRelationshipType = null;
		// TODO: get rid of this hack by properly organizing the state
		edgesVersion++;
		onChange();
	}

	const handleDelete: OnDelete<Node, FtMFlowEdge> = ({
		nodes: deletedNodes,
		edges: deletedEdges,
	}) => {
		for (const node of deletedNodes) {
			// TODO: handle removal of edges, if there are any referencing this entity
			// TODO: extract this code and merge/deduplicate with deleteSelectedNode.
			const index = entities.findIndex((e) => e.id === node.id);
			if (index !== -1) entities.splice(index, 1);
			delete canvasPositions[node.id];
		}
		for (const edge of deletedEdges) {
			if (edge.type === 'property') {
				const entity = entities.find((e) => e.id === edge.source);
				if (entity) {
					entity.getProperty(edge.data.property).remove(edge.target);
				}
			}
		}
		onChange();
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
			onnodeclick={onNodeClick}
			onnodedragstop={onNodeDragStop}
			onpaneclick={closeSidebar}
			{isValidConnection}
			onbeforeconnect={handleBeforeConnect}
			onconnectend={handleConnectEnd}
			ondelete={handleDelete}
			zoomOnDoubleClick={false}
			fitView
			colorMode="system"
		>
			<ViewportPortal target="front">
				{#if pendingInput}
					<div
						style="position:absolute; left:{pendingInput.flowPos
							.x}px; top:{pendingInput.flowPos.y}px;"
					>
						<input
							bind:this={inputEl}
							onkeydown={onKeydown}
							onblur={() => commit()}
							placeholder="Node label…"
						/>
					</div>
				{/if}
				{#if pendingSelectRelationshipType && pendingSelectRelationshipType.linkTypes}
					<div
						class="nodrag nopan"
						style="position:absolute; pointer-events:all; left:{pendingSelectRelationshipType
							.position.x}px; top:{pendingSelectRelationshipType
							.position.y}px;"
					>
						<LinkTypeChooser
							items={pendingSelectRelationshipType.linkTypes}
							onSelect={createLink}
						></LinkTypeChooser>
					</div>
				{/if}
			</ViewportPortal>
			<Controls />
			<MiniMap />
			<Background variant={BackgroundVariant.Dots} gap={12} size={1} />
		</SvelteFlow>
	</div>
	{#if selectedEntity}
		<ContextPanel>
			<!-- TODO: Editor doesn't have any effect right now -->
			<EntityEditor
				card={createCardStateFromEntity(
					model.generateRandomId(),
					selectedEntity,
				)}
				{schemata}
				onDelete={deleteSelectedNode}
			/>
		</ContextPanel>
	{/if}
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
