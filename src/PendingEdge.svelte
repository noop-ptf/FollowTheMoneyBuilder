<script lang="ts">
	import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/svelte';

	let { id, sourceX, sourceY, targetX, targetY }: EdgeProps = $props();

	let [edgePath] = $derived(
		getBezierPath({
			sourceX,
			sourceY,
			targetX,
			targetY,
		}),
	);
</script>

<BaseEdge {id} path={edgePath} />
