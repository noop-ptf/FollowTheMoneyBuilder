<script lang="ts">
	import FTMNetworkFlow from './FTMNetworkFlow.svelte';
	import { SvelteFlowProvider } from '@xyflow/svelte';
</script>

<div class="ftm-network">
	<!-- The Provider needs to be in its own component, 
		 such that useSvelteFlow and other hooks can work. -->
	<SvelteFlowProvider>
		<FTMNetworkFlow />
	</SvelteFlowProvider>
</div>

<style>
	.ftm-network {
		height: 100%;
	}
</style>
