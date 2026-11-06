import obsidianmd from 'eslint-plugin-obsidianmd';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
	]),
	{
		languageOptions: {
			globals: { ...globals.browser },
			parserOptions: {
				projectService: {
					allowDefaultProject: ['manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json', '.svelte'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser, // for <script lang="ts">
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte'],
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
		},
	},
	{
		files: ['**/*.ts', '**/*.tsx', '**/*.svelte'],
		rules: {
			'eslint-comments/no-restricted-disable': 'off',
			'svelte/prefer-const': 'error',
			'obsidianmd/ui/sentence-case': [
				'warn',
				{
					brands: [
						'OpenAleph',
						'FtM',
						'FtM Network',
						'Follow the Money',
						'Follow the Money Builder',
						'Obsidian',
					],
					mode: 'loose',
				},
			],
		},
	},
);
