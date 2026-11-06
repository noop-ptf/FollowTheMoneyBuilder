<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import type { Entity, Schema } from '@opensanctions/followthemoney';
	import { getSchemaCategory } from './schemaStyle';
	import SchemaIcon from './SchemaIcon.svelte';

	type EntityNodeData = {
		caption: string;
		schema?: Schema;
		entity?: Entity;
	};

	let { data }: NodeProps & { data: EntityNodeData } = $props();

	const category = $derived(
		data.schema ? getSchemaCategory(data.schema) : 'default',
	);
</script>

<Handle type="target" position={Position.Top} />
<div class="entity-node" data-category={category}>
	{#if data.schema}
		<div class="eyebrow">
			<SchemaIcon schema={data.schema} size={16} />
			<span>{data.schema.label}</span>
		</div>
	{/if}
	<div class="caption">{data.caption || 'Untitled'}</div>
</div>
<Handle type="source" position={Position.Bottom} />

<style>
	.entity-node {
		display: flex;
		flex-direction: column;
		gap: 0.3em;
		min-width: 160px;
		padding: 0.6em 0.8em;
		border-radius: 8px;
		border-left: 4px solid var(--schema-default-fg);
		background: #ffffff;
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
