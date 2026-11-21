<script lang="ts">
	import FTMNetworkFlow from './FTMNetworkFlow.svelte';
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import type { NetworkState } from './networkState.svelte';

	let {
		network,
		onChange,
		openEntityBuilder,
		chooseEntityType,
	}: {
		network: NetworkState;
		onChange: () => void;
		openEntityBuilder: () => void;
		chooseEntityType: () => Promise<string | undefined>;
	} = $props();
</script>

<div class="ftm-network">
	<!-- The Provider needs to be in its own component, 
		 such that useSvelteFlow and other hooks can work. -->
	<SvelteFlowProvider>
		<FTMNetworkFlow
			{network}
			{onChange}
			{openEntityBuilder}
			{chooseEntityType}
		/>
	</SvelteFlowProvider>
</div>

<style>
	.ftm-network {
		height: 100%;
	}
</style>
