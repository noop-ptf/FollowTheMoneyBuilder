import {
	App,
	Notice,
	PluginSettingTab,
	SecretComponent,
	Setting,
	SettingPage,
	type SettingDefinitionItem,
	requestUrl,
} from 'obsidian';
import type {
	OpenAlephInstanceSettings,
	FTMBuilderPluginSettings,
} from './types';
import FTMBuilderPlugin from './main';

export const DEFAULT_INSTANCE: Omit<OpenAlephInstanceSettings, 'id'> = {
	apiKeyName: '',
	name: 'OpenAleph instance',
	instanceUrl: 'https://search.openaleph.org',
	enabled: true,
	connectionValid: false,
};

export const DEFAULT_SETTINGS: FTMBuilderPluginSettings = {
	entityFolder: 'followthemarkdown',
	instances: [],
};

class InstancesPage extends SettingPage {
	constructor(
		private plugin: FTMBuilderPlugin,
		private app: App,
	) {
		super();
		this.title = 'Instance configuration';
	}

	private renderInstance(
		containerEl: HTMLElement,
		instance: OpenAlephInstanceSettings,
		index: number,
	): void {
		const box = containerEl.createDiv({
			cls: 'ftmbuilder-source-box',
		});

		new Setting(box)
			.setName(instance.name || `Instance ${index + 1}`)
			.setHeading()
			.addToggle((toggle) =>
				toggle.setValue(instance.enabled).onChange(async (value) => {
					instance.enabled = value;
					await this.plugin.saveSettings();
				}),
			)
			.addExtraButton((btn) =>
				btn
					.setIcon('trash')
					.setTooltip('Remove instance')
					.onClick(async () => {
						this.plugin.settings.instances.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}),
			)
			.addExtraButton((btn) => {
				const setIdleIcon = () => {
					btn.setIcon(
						instance.connectionValid ? 'badge-check' : 'plug-zap',
					);
					btn.extraSettingsEl.classList.toggle(
						'ftmbuilder-instance-connection-valid',
						instance.connectionValid,
					);
					btn.extraSettingsEl.classList.toggle(
						'ftmbuilder-instance-connection-invalid',
						!instance.connectionValid,
					);
				};

				setIdleIcon();
				btn.setTooltip('Test the connection');

				btn.onClick(async () => {
					btn.setDisabled(true);
					btn.extraSettingsEl.classList.remove(
						'ftmbuilder-instance-connection-valid',
					);
					btn.extraSettingsEl.classList.remove(
						'ftmbuilder-instance-connection-invalid',
					);
					btn.setIcon('loader-2');
					btn.extraSettingsEl.addClass('ftmbuilder-spin');

					try {
						const apiKey = this.app.secretStorage.getSecret(
							instance.apiKeyName,
						);
						instance.connectionValid = await canConnect(
							instance.instanceUrl,
							apiKey,
						);
						await this.plugin.saveSettings();
						new Notice(
							instance.connectionValid
								? 'Connection successful'
								: 'Could not connect to instance. Check the URL and the API key.',
						);
					} finally {
						btn.extraSettingsEl.classList.remove('ftmbuilder-spin');
						btn.setDisabled(false);
						setIdleIcon();
					}
				});

				return btn;
			});

		new Setting(box).setName('Name').addText((text) =>
			text.setValue(instance.name).onChange(async (value) => {
				instance.name = value;
				await this.plugin.saveSettings();
			}),
		);

		new Setting(box).setName('Instance URL').addText((text) =>
			text
				.setPlaceholder('https://search.openaleph.org')
				.setValue(instance.instanceUrl)
				.onChange(async (value) => {
					instance.instanceUrl = value;
					instance.connectionValid = false;
					await this.plugin.saveSettings();
				}),
		);

		new Setting(box).setName('API key').addComponent((el) =>
			new SecretComponent(this.app, el)
				.setValue(instance.apiKeyName)
				.onChange(async (value) => {
					instance.apiKeyName = value;
					instance.connectionValid = false;
					await this.plugin.saveSettings();
				}),
		);
	}

	display() {
		const containerEl = this.containerEl;
		containerEl.empty();

		containerEl.createEl('p', {
			text: 'Add the URL and API key for OpenAleph instances, in order to allow Obsidian to fetch investigations and store entities in them.',
		});

		this.plugin.settings.instances.forEach((instance, index) => {
			this.renderInstance(containerEl, instance, index);
		});

		new Setting(containerEl).addButton((btn) =>
			btn
				.setButtonText('Add instance')
				.setCta()
				.onClick(async () => {
					const instance: OpenAlephInstanceSettings = {
						...DEFAULT_INSTANCE,
						id: crypto.randomUUID(),
					};
					this.plugin.settings.instances.push(instance);
					await this.plugin.saveSettings();
					this.display();
				}),
		);
	}
}

export class FTMBuilderSettingTab extends PluginSettingTab {
	plugin: FTMBuilderPlugin;

	constructor(app: App, plugin: FTMBuilderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Follow the Money entity folder',
				desc: 'The created Follow the Money entities will be saved here, as Markdown notes.',
				control: {
					type: 'text',
					key: 'entityFolder',
					placeholder: 'followthemarkdown',
				},
			},
			{
				type: 'page',
				name: 'Instance configuration',
				page: () => new InstancesPage(this.plugin, this.app),
			},
		];
	}
}

async function canConnect(instanceUrl: string, apiKey: string | null) {
	const url = new URL('/api/2/status', instanceUrl);
	const headers: Record<string, string> = {
		'User-Agent': 'alephclient',
		Pragma: 'no-cache',
	};
	if (apiKey !== null) {
		headers['Authorization'] = apiKey;
	}
	const request = {
		url: url.toString(),
		headers,
	};
	try {
		const res = await requestUrl(request);
		// throws if the body isn't valid JSON
		const body = res.json as unknown;
		// 0, false or "" are valid JSON
		return body !== undefined && body !== null;
	} catch {
		return false;
	}
}
