<script lang="ts">
	import { untrack } from 'svelte';
	import { focusOnMount } from './attachments';

	let {
		name,
		type,
		value = $bindable(),
	}: {
		name: string;
		type: string;
		value: string | undefined;
	} = $props();
	const typeMapping: Record<string, { type: string; placeholder?: string }> =
		{
			date: { type: 'text', placeholder: 'YYYY-MM-DD' },
			phone: { type: 'tel', placeholder: '+49...' },
			number: { type: 'number' },
			email: { type: 'email', placeholder: 'jd@example.com' },
			url: { type: 'url', placeholder: 'https://example.com' },
		};
</script>

<input
	type={typeMapping[type]?.type || 'text'}
	{name}
	placeholder={typeMapping[type]?.placeholder}
	bind:value
	{@attach focusOnMount(untrack(() => value))}
/>

<style>
	input {
		all: unset;
		min-width: 20px;
		field-sizing: content;
	}
</style>
