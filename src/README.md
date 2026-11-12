The `src` directory is structured as follows...

- `builder`: Everything related to the "Builder" sidebar/feature.
- `network`: Everything related to the "FtM Network" feature.
- `ftm`: All Follow the Money specific code/logic, consider it a core dependency.
- `ui`: The more generic UI elements, but sometimes already mixed with domain logic (e.g. SchemaCombobox)
- `lib`: Some helpers and OpenAleph API logic

If you want to get started, these are the files to start reading:

- main.ts
- views.ts
- networkState.svelte.ts

Alternatively you can go feature by feature, for that the directories `builder` and `network` will lead the way.

Here's an opinionated dependency tree (opinionated because it is purged in some places and not claiming to be complete):

- main.ts
    - builder/builderState.svelte.ts
        - builder/cardState.svelte.ts
    - view.ts
        - networkState.svelte.ts
            - ftm/
                - model.ts
                - util.ts
            - lib/persistence.ts
        - uiState.svelte.ts
        - builder/
            - EntityCardGrid.svelte
                - PropertyChooserDialog.svelte
                    - ftm/propertyGrouping.ts
                    - ui/GroupedItemChooser.svelte
                - EntityCard.svelte
                    - EntityEditor.svelte
                        - PropertyField.svelte
                            - ui/CustomCombobox.svelte
                            - PropertyInput.svelte
                    - EntitySummary.svelte
                - CollectionSelector.svelte
                    - store.ts
                - lib/
                    - requests.ts
                    - noteExport.ts
        - network/
            - FTMNetworkDiagram.svelte
                - FTMNetworkFlow.svelte
                    - EntityNode.svelte
                    - InterstitialEdge.svelte
                    - LinkTypeChooser.svelte
                    - ftm/
                        - LinkType.ts
                        - model.ts
                    - types.ts

For more background information on the code, check out DEVELOPMENT.md in the root of the repository.
