<script lang="ts">
	import FTMNetworkFlow from './FTMNetworkFlow.svelte';
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import type { NetworkState } from './networkState.svelte';

	let {
		network,
		onChange,
	}: {
		network: NetworkState;
		onChange: () => void;
	} = $props();
</script>

<div class="ftm-network">
	<!-- The Provider needs to be in its own component, 
		 such that useSvelteFlow and other hooks can work. -->
	<SvelteFlowProvider>
		<FTMNetworkFlow {network} {onChange} />
	</SvelteFlowProvider>
</div>

<style>
	.ftm-network {
		height: 100%;
	}
</style>
