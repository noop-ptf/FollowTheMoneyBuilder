import { App, Modal, FuzzySuggestModal, TFile, Notice } from 'obsidian';
import { mount, unmount } from 'svelte';
import EntityTypeSelectModal from './EntityTypeSelectModal.svelte';

export class ConfirmSaveModal extends Modal {
	private folderPath: string;
	private preview: string;
	private onConfirm: () => Promise<void>;

	constructor(
		app: App,
		folderPath: string,
		preview: string,
		onConfirm: () => Promise<void>,
	) {
		super(app);
		this.folderPath = folderPath;
		this.preview = preview;
		this.onConfirm = onConfirm;
	}

	override onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Save entities to vault' });

		contentEl.createEl('p', {
			text: `The entities below will all be saved to your vault as separate notes in ${this.folderPath}`,
		});

		const notePreview = contentEl.createDiv({
			cls: 'ftmbuilder-note-preview-container',
		});

		const preview =
			this.preview.length > 300
				? this.preview.slice(0, 300) + '…'
				: this.preview;

		notePreview.createEl('pre', {
			text: preview,
			cls: 'ftmbuilder-note-preview',
		});

		const buttonContainer = contentEl.createDiv({
			cls: 'modal-button-container',
		});

		const confirmButton = buttonContainer.createEl('button', {
			text: 'Confirm',
			cls: 'mod-cta',
		});
		confirmButton.addEventListener('click', () => {
			this.close();
			void this.onConfirm(); // onConfirm must handle its own errors.
		});

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel',
		});
		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	override onClose() {
		this.contentEl.empty();
	}
}

// TODO: turn this into FuzzySuggestModal or Dialog
export class ChooseEntityTypeModal extends Modal {
	private resolve: (entityType?: string) => void;
	private result: string | undefined;
	component: ReturnType<typeof EntityTypeSelectModal> | undefined;

	constructor(app: App, resolve: (entityType?: string) => void) {
		super(app);
		this.resolve = resolve;
	}

	override onOpen() {
		this.result = undefined;
		this.component = mount(EntityTypeSelectModal, {
			target: this.contentEl,
			props: {
				onConfirm: (entityType: string) => {
					this.result = entityType;
					this.close();
				},
				onCancel: () => {
					this.close();
				},
			},
		});
	}

	override onClose() {
		if (this.component) {
			void unmount(this.component);
			this.component = undefined;
		}
		this.resolve(this.result);
	}
}

export class OpenNetworkModal extends FuzzySuggestModal<TFile> {
	private readonly files: TFile[];

	constructor(app: App, files: TFile[]) {
		super(app);
		this.files = files;
		this.emptyStateText = 'No FtM Network found';
		this.setPlaceholder('Search FtM Networks...');
	}
	getItems(): TFile[] {
		return this.files;
	}

	getItemText(file: TFile): string {
		// Drop the extension from the item text (as we're currently
		// only showing ftm-network files and it's a bit noisy...)
		return file.path.slice(0, -(file.extension.length + 1));
	}

	onChooseItem(file: TFile): void {
		this.app.workspace
			.getLeaf(false)
			.openFile(file)
			.catch((err: unknown) => {
				const message =
					err instanceof Error ? err.message : String(err);
				new Notice(message);
			});
	}
}
