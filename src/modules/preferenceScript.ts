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
      `#zotero-prefpane-${config.addonRef}-shortcut-enable`
    )
    ?.addEventListener("command", (e) => {
      KeyExampleFactory.registerRenameShortcuts();
    });

  addon.data
    .prefs!.window.document.querySelector(
      `#zotero-prefpane-${config.addonRef}-shortcut-modifiers`
    )
    ?.addEventListener("change", (e) => {
      KeyExampleFactory.registerRenameShortcuts();
    });

  addon.data
    .prefs!.window.document.querySelector(
      `#zotero-prefpane-${config.addonRef}-shortcut-key`
    )
    ?.addEventListener("change", (e) => {
      KeyExampleFactory.registerRenameShortcuts();
    });
}
