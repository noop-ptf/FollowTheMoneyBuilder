# Follow the Money Builder for Obsidian

This Obsidian plug-in allows the user to create [Follow the Money](https://followthemoney.tech/) entities independent of, but optionally for, OpenAleph.

⚠️ This plug-in is in an Alpha stage. It _may_ still contain bugs. If you would like to report a bug or request a feature, please [open an Issue](https://codeberg.org/Noop/FollowTheMoneyBuilder/issues).

## Installation

You must have [Obsidian](https://obsidian.md/) installed in order to use this plug-in.

Your Obsidian app version must be equal or newer `1.13.0`. You can see the version by opening the **Settings** and navigating to the **General** section. If you have an older version of Obsidian, [upgrade to a more recent version](https://obsidian.md/help/updates).

This plug-in can be installed directly via the Obsidian Community plug-ins catalogue. Two other installation methods are detailed below.

### Install using the BRAT plug-in

If you already have the Beta Reviewers Auto-update Tester plug-in (called BRAT), you can add `https://github.com/noop-ptf/FollowTheMoneyBuilder` and select the latest version of this plug-in.

<p align="center"><img src="src/assets/brat.png" alt="Screenshot demonstrating how to add the GitHub URL for  OpenAleph Explore plug-in to BRAT" width="500" height="1100"></p>

### Install from source code

1. Make sure you have NodeJS installed, and that the version is at least v18 (`node --version`). If you don't have NodeJS installed, follow [the official instructions](https://nodejs.org/en/download)
2. Navigate to the plug-ins directory of your Obsidian vault (usually located at `VaultName/.obsidian/plugins/your-plugin-id/`). Here, run `git clone https://github.com/noop-ptf/FollowTheMoneyBuilder.git`.
3. Navigate into the newly-created directory, that contains the source code, and install the dependencies: `npm i`
4. Run `npm run build`. This should produce three files: `main.js`, `styles.css`, `manifest.json`.
5. Open Obsidian, navigate to the **Settings** > **Community plugins** and refresh the list of plug-ins. Follow the Money Builder should appear. Enable it.

## Related projects

[OpenAleph Search](https://github.com/noop-ptf/OpenAlephSearch) allows a user to search through many different FollowTheMoney instances simultaneously.
[OpenAleph Explore](https://github.com/noop-ptf/OpenAlephExplore) allows a user to send a note to all the OpenAleph instances they have access to in order to extract structured Follow the Money data and related terms.

## Sponsor

Follow the Money Builder: an Obsidian Plug-in is funded by the German **Federal Ministry of Research, Technology and Space (BMFTR)** through the **[Prototype Fund](https://prototypefund.de)** under funding code (Förderkennzeichen) **16IS26S15**.

<img src="src/assets/bmftr-funding.png" alt="Funded by the German Federal Ministry of Research, Technology and Space (BMFTR)" width="200">
<img src="src/assets/prototype-fund-en.png" alt="Funded through the Prototype Fund" width="200">
