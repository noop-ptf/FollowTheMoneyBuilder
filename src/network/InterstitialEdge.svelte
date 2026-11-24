<script lang="ts">
	import { getBezierPath, BaseEdge, EdgeLabel } from '@xyflow/svelte';
	import type { InterstitialFlowEdgeProps } from './types';

	let {
		id,
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
		selected,
		markerEnd,
		data,
	}: InterstitialFlowEdgeProps = $props();

	let [edgePath, labelX, labelY] = $derived(
		getBezierPath({
			sourceX,
			sourceY,
			sourcePosition,
			targetX,
			targetY,
			targetPosition,
		}),
	);
</script>

<BaseEdge {id} path={edgePath} {markerEnd} />
{#if data}
	<EdgeLabel x={labelX} y={labelY} selectEdgeOnClick={true}>
		<div class="edge-label" class:selected>
			{data.label}
		</div>
	</EdgeLabel>
{/if}

<style>
	.edge-label {
		background-color: var(--background-secondary);
		padding: 10px;
		border-radius: 5px;
		font-size: 12px;
	}

	.edge-label.selected {
		box-shadow: 0 0 0 1px var(--text-normal);
	}
</style>
