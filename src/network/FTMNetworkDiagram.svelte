<script lang="ts">
	import { SvelteFlowProvider } from '@xyflow/svelte';
	import type { NetworkState } from '../networkState.svelte';
	import type { UIState } from '../uiState.svelte';
	import FTMNetworkFlow from './FTMNetworkFlow.svelte';

	let {
		network,
		ui,
		onChange,
		openEntityBuilder,
		chooseEntityType,
	}: {
		network: NetworkState;
		ui: UIState;
		onChange: () => void;
		openEntityBuilder: () => void;
		chooseEntityType: () => Promise<string | undefined>;
	} = $props();
</script>

<div class="ftmbuilder-network">
	<!-- The Provider needs to be in its own component, 
		 such that useSvelteFlow and other hooks can work. -->
	<SvelteFlowProvider>
		<FTMNetworkFlow
			{network}
			{ui}
			{onChange}
			{openEntityBuilder}
			{chooseEntityType}
		/>
	</SvelteFlowProvider>
</div>

<style>
	.ftmbuilder-network {
		height: 100%;
	}
</style>
