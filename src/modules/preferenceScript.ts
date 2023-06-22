import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { KeyExampleFactory } from "./examples";

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/chrome/content/preferences.xul onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [],
      rows: [],
    };
  } else {
    addon.data.prefs.window = _window;
  }
  bindPrefEvents();
}

function bindPrefEvents() {
  addon.data
    .prefs!.window.document.querySelector(
      `#zotero-prefpane-${config.addonRef}-enableShortcut`
    )
    ?.addEventListener("command", (e) => {
      KeyExampleFactory.registerRenameShortcuts();
    });

  // addon.data
  //   .prefs!.window.document.querySelector(
  //     `#zotero-prefpane-${config.addonRef}-renameMod`
  //   )
  //   ?.addEventListener("change", (e) => {
  //     addon.data.prefs!.window.alert(
  //       `Successfully changed to ${(e.target as HTMLInputElement).value}!`
  //     );
  //     KeyExampleFactory.registerRenameShortcuts();
  //   });

  // addon.data
  //   .prefs!.window.document.querySelector(
  //     `#zotero-prefpane-${config.addonRef}-renameKey`
  //   )
  //   ?.addEventListener("change", (e) => {
  //     addon.data.prefs!.window.alert(
  //       `Successfully changed to ${(e.target as HTMLInputElement).value}!`
  //     );
  //     KeyExampleFactory.registerRenameShortcuts();
  //   });
}
