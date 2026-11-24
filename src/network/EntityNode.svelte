<script lang="ts">
	import {
		Handle,
		Position,
		useConnection,
		type NodeProps,
	} from '@xyflow/svelte';
	import { obsidianIcon } from '../lib/attachments';
	import type { EntityNodeData } from './types';

	type Props = NodeProps & { data: EntityNodeData };
	let { id, data, selected }: Props = $props();

	const connection = useConnection();

	// It would be possible to make a more complicated validity calculation here,
	// but unless a non-standard Schema is used, each target will always be valid,
	// because "Unknown Link" will be a valid option.
	// https://followthemoney.tech/explorer/schemata/UnknownLink/
	let isTarget = $derived.by(() => {
		const inProgress = connection.current.inProgress;
		const differentNode = connection.current.fromHandle?.nodeId !== id;
		return inProgress && differentNode;
	});
</script>

<div class="entity-node-wrapper">
	<div class="entity-node" class:selected class:isTarget>
		<span
			class="drag-grip"
			aria-label="Drag the entity"
			{@attach obsidianIcon('grip-horizontal')}
		></span>
		<Handle
			class="customHandle"
			aria-label="Drag to create a link to another entity"
			position={Position.Right}
			type="source"
			style="z-index: 1;"
		/>
		<Handle
			class="customHandle"
			position={Position.Left}
			type="target"
			isConnectableStart={false}
		/>
		<div class="caption">{data.caption}</div>
		{#if data.schema}
			<div class="eyebrow">
				<span>{data.schema.label}</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.entity-node-wrapper {
		background-color: var(--background-primary);
		border-radius: 8px;
	}
	.entity-node {
		display: flex;
		align-items: center;
		flex-direction: column;
		gap: 0.3em;
		min-width: 160px;
		padding: 4px 16px 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--background-modifier-border);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
	}

	.entity-node.selected {
		box-shadow: 0 0 0 2px var(--text-muted);
		background-color: var(--background-modifier-hover);
	}

	.entity-node.isTarget {
		outline: 2px dashed var(--text-muted);
	}

	.drag-grip {
		display: flex;
		color: var(--text-faint);
		--icon-size: var(--icon-s);
	}

	:global(.customHandle) {
		width: 100%;
		height: 75%;
		position: absolute;
		top: 25%;
		left: 0;
		border-radius: 0;
		transform: none;
		border: none;
		opacity: 0;
	}

	.eyebrow {
		display: flex;
		align-items: center;
		gap: 0.35em;
		font-size: 0.75em;
		opacity: 0.7;
	}

	.caption {
		font-weight: 700;
		font-size: 1em;
	}
</style>
