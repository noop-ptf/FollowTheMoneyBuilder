<script lang="ts">
	import { getBezierPath, BaseEdge, EdgeLabel } from '@xyflow/svelte';
	import type { InterstitialFlowEdgeProps } from './flowTypes';

	let {
		id,
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
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

<BaseEdge {id} path={edgePath} />
{#if data}
	<!-- TODO: is it possible to select the edge on label click? -->
	<EdgeLabel x={labelX} y={labelY}>
		<div class="edge-label">
			{data.label}
		</div>
	</EdgeLabel>
{/if}

<style>
	.edge-label {
		background-color: #ffcc00;
		color: #000;
		padding: 10px;
		border-radius: 5px;
		font-size: 12px;
		font-weight: 700;
	}
</style>
