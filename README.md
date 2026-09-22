# sotf-inventory

A browser based inventory editor for Sons of the Forest. Runs entirely on your computer, nothing is uploaded.

Live page: https://justinoros.github.io/sotf-inventory/

## How to use

1. Close Sons of the Forest.
2. Open your save folder: `%USERPROFILE%\AppData\LocalLow\Endnight\SonsOfTheForest\Saves\<SteamID>\SinglePlayer\<SaveID>\`
3. Copy `SaveData.zip` somewhere safe as a backup.
4. Drag `SaveData.zip` onto the page, or click Browse.
5. Search for items and set their counts. Counts are limited from 0 to the in game max for each item.
6. Click Save to download the new `SaveData.zip`.
7. Replace the old `SaveData.zip` in your save folder with the new one and start the game.

A loose `PlayerInventorySaveData.json` also works if you prefer to edit the extracted file.

## Notes

* Unequip items in game before you save and quit. Equipped items are shown but locked.
* Items the editor doesn't recognize are marked unknown and can only be lowered, not raised.
* Blueprints also need entries in `PlayerStateSaveData.json` to show as unlocked. This tool only edits inventory.
* Browsers can't open a file dialog at a specific folder. Use Copy path and paste it into the dialog's address bar. Chrome and Edge remember the last folder you picked.

## Hosting on GitHub Pages

Push the repo, then go to Settings, Pages, and set the source to the `main` branch root.

## Files

* `index.html` page layout
* `styles.css` theme
* `app.js` load, edit, and save logic
* `items.js` item IDs, names, categories, and max counts

## Credits

Item IDs, names, and inventory limits come from [SOTFEdit](https://github.com/codengine/SOTFEdit) by codengine, MIT License.

Not affiliated with Endnight Games.
