<script lang="ts">
	import {
		type Edge,
		SvelteFlow,
		useSvelteFlow,
		Controls,
		MiniMap,
		Background,
		BackgroundVariant,
		type XYPosition,
		type Node,
		ViewportPortal,
		type IsValidConnection,
	} from '@xyflow/svelte';
	import EntityNode from './EntityNode.svelte';
	import ContextPanel from './ContextPanel.svelte';
	import {
		createCardStateFromEntity,
		getCardCaption,
		type CardState,
	} from './entityCard';
	import { listEntitySchemata, model, valueToString } from './ftm';
	import EntityEditor from './EntityEditor.svelte';
	import type { NetworkState } from './networkState.svelte';

	const uid = $props.id();

	let {
		network,
		onChange,
	}: {
		network: NetworkState;
		onChange: () => void;
	} = $props();

	const cards = $derived(network.cards);
	const canvasPositions = $derived<Record<string, { x: number; y: number }>>(
		network.positions,
	);

	const nodeTypes = { entity: EntityNode };
	const schemata = listEntitySchemata();

	let edges = $derived.by(() => {
		const entities = cards
			.map((c) => c.entity)
			.filter((e) => e !== undefined);
		const id2key = new Map(
			cards
				.filter((c) => c.entity !== undefined)
				.map((c) => [c.entity!.id, c.key]),
		);
		const result: Edge[] = [];
		for (const entity of entities) {
			// Not entirely sure how to enumerate edges... I think only an entity type can be an edge?
			for (const property of entity
				.getProperties()
				.filter((p) => p.type.isEntity)) {
				const sourceEntityId = id2key.get(entity.id);
				if (!sourceEntityId) continue;
				for (const value of entity.getProperty(property)) {
					const targetEntityId = id2key.get(valueToString(value));
					if (!targetEntityId) continue;
					result.push({
						id: `${sourceEntityId}-${targetEntityId}`,
						source: sourceEntityId,
						target: targetEntityId,
					});
				}
			}
		}
		return result;
	});

	// Nodes are a projection of the shared `cards` store. <SvelteFlow> writes
	// back into `nodes` (drag, selection, measurements); a writable $derived
	// keeps those overrides until `cards`/`canvasPositions` change, at which
	// point it recomputes. Drags persist via onNodeDragStop -> canvasPositions.
	let nodes = $derived.by(() =>
		cards.map((card) => ({
			id: card.key,
			type: 'entity',
			position: { ...(canvasPositions[card.key] ?? { x: 0, y: 0 }) },
			data: {
				caption: getCardCaption(card),
				schema: card.entity?.schema,
				entity: card.entity,
			},
		})),
	);

	// Cards created outside the canvas (e.g. in the grid) have no position yet.
	// Lay them out in a grid below the already-positioned nodes, and persist
	// the result so they stay put rather than reflowing as other nodes move.
	const LAYOUT = { cols: 4, dx: 220, dy: 110 };

	$effect(() => {
		const unpositioned = cards.filter((c) => !canvasPositions[c.key]);
		if (unpositioned.length === 0) return;

		const placed = cards
			.map((c) => canvasPositions[c.key])
			.filter((p) => p !== undefined);
		const left = placed.length ? Math.min(...placed.map((p) => p.x)) : 0;
		const top = placed.length
			? Math.max(...placed.map((p) => p.y)) + LAYOUT.dy
			: 0;

		unpositioned.forEach((card, i) => {
			canvasPositions[card.key] = {
				x: left + (i % LAYOUT.cols) * LAYOUT.dx,
				y: top + Math.floor(i / LAYOUT.cols) * LAYOUT.dy,
			};
		});
	});

	let pendingInput = $state<{ flowPos: XYPosition } | null>(null);
	let inputEl = $state<HTMLInputElement>();

	// A direct reference into `cards`, so sidebar edits flow to the node face
	// (and the grid, and storage) without any writeback.
	let selectedCard = $state<CardState | null>(null);

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
		const card = createCardStateFromEntity(
			model.generateRandomId(),
			undefined,
		);
		canvasPositions[card.key] = pendingInput.flowPos;
		cards.push(card);
		pendingInput = null;
		onChange();
	}

	function onKeydown(
		event: KeyboardEvent & { currentTarget: HTMLInputElement },
	) {
		if (event.key === 'Enter') commit();
		if (event.key === 'Escape') pendingInput = null;
	}

	function onNodeClick({ node }: { node: Node }) {
		if (node.type !== 'entity') return;
		selectedCard = cards.find((c) => c.key === node.id) ?? null;
	}

	function closeSidebar() {
		selectedCard = null;
	}

	function deleteSelectedNode() {
		if (!selectedCard) return;
		const index = cards.findIndex((c) => c.key === selectedCard?.key);
		if (index !== -1) cards.splice(index, 1);
		delete canvasPositions[selectedCard.key];
		closeSidebar();
		onChange();
	}

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
	const isValidConnection: IsValidConnection = (connection) => {
		// 1. What is the source entity type?
		const sourceEntity = cards.find(
			(c) => c.key === connection.source,
		)?.entity;
		if (sourceEntity === undefined) return false;
		// 2. What is the target entity type?
		const targetEntity = cards.find(
			(c) => c.key === connection.target,
		)?.entity;
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
</script>

<div class="workspace">
	<div class="content" ondblclick={onWrapperDblClick} role="application">
		<SvelteFlow
			id="ftm-flow-{uid}"
			bind:nodes
			bind:edges
			{nodeTypes}
			onnodeclick={onNodeClick}
			onnodedragstop={onNodeDragStop}
			onpaneclick={closeSidebar}
			{isValidConnection}
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
			</ViewportPortal>
			<Controls />
			<MiniMap />
			<Background variant={BackgroundVariant.Dots} gap={12} size={1} />
		</SvelteFlow>
	</div>
	{#if selectedCard}
		<ContextPanel>
			<EntityEditor
				bind:card={selectedCard}
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
