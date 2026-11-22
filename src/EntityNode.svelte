<script lang="ts">
	import {
		Handle,
		Position,
		useConnection,
		type NodeProps,
	} from '@xyflow/svelte';
	import { getSchemaCategory } from './schemaStyle';
	import SchemaIcon from './SchemaIcon.svelte';
	import type { EntityNodeData } from './flowTypes';
	import { Schema } from '@opensanctions/followthemoney';

	let { id, data, selected }: NodeProps & { data: EntityNodeData } = $props();

	const category = $derived(
		data.schema ? getSchemaCategory(data.schema) : 'default',
	);

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
	<div
		class="entity-node"
		class:selected
		class:isTarget
		data-category={category}
	>
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
		{#if data.schema}
			<div class="eyebrow">
				<SchemaIcon schema={data.schema} size={16} />
				<span>{data.schema.label}</span>
			</div>
		{/if}
		<div class="caption">{data.caption || 'Untitled'}</div>
	</div>
</div>

<style>
	.entity-node-wrapper {
		background-color: white;
	}
	.entity-node {
		display: flex;
		flex-direction: column;
		gap: 0.3em;
		min-width: 160px;
		padding: 0.6em 0.8em;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
	}

	.entity-node[data-category='person'] {
		border-left-color: var(--schema-person-fg);
	}

	.entity-node[data-category='legalEntity'] {
		border-left-color: var(--schema-legalentity-fg);
	}

	.entity-node[data-category='document'] {
		border-left-color: var(--schema-document-fg);
	}

	.entity-node.selected {
		box-shadow: 0 0 0 2px var(--schema-default-fg);
		background-color: var(--background-modifier-hover);
	}

	.entity-node.isTarget {
		outline: 2px dashed var(--schema-default-fg);
	}

	:global(.customHandle) {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
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
		font-weight: 600;
		font-size: 0.95em;
	}

	@media (prefers-color-scheme: dark) {
		.entity-node {
			background: #0f0f0f98;
		}
	}
</style>
