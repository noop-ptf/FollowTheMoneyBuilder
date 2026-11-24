<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { focusOnMount } from '../lib/attachments';

	type Props = {
		name: string;
		type: string;
		value: string | undefined;
	};
	let { name, type, value = $bindable() }: Props = $props();
	const typeMapping: Record<
		string,
		Pick<HTMLInputAttributes, 'type' | 'placeholder' | 'inputmode'>
	> = {
		date: { type: 'text', placeholder: 'YYYY-MM-DD' },
		phone: { type: 'tel', placeholder: '+49...' },
		number: { type: 'text', inputmode: 'decimal' },
		email: { type: 'email', placeholder: 'jd@example.com' },
		url: { type: 'url', placeholder: 'https://example.com' },
	};
</script>

<input
	{...typeMapping[type]}
	{name}
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
