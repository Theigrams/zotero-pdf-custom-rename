import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { messageWindow, renameSelectedItems } from "./rename";

function example(
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value;
  descriptor.value = function (...args: any) {
    try {
      ztoolkit.log(`Calling example ${target.name}.${String(propertyKey)}`);
      return original.apply(this, args);
    } catch (e) {
      ztoolkit.log(`Error in example ${target.name}.${String(propertyKey)}`, e);
      throw e;
    }
  };
  return descriptor;
}

export class BasicExampleFactory {
  @example
  static registerPrefs() {
    Zotero.PreferencePanes.register({
      pluginID: config.addonID,
      src: rootURI + "chrome/content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    });
  }
}

export class KeyExampleFactory {
  @example
  static registerRenameShortcuts() {
    if (!Zotero.Prefs.get("pdfrename.shortcut.enable")) {
      messageWindow(`Shortcut off`, "default");
      return;
    }
    const modSet =
      Zotero.Prefs.get("pdfrename.shortcut.modifiers")?.toString() ?? "accel";
    const keySet =
      Zotero.Prefs.get("pdfrename.shortcut.key")?.toString() ?? "D";
    const target = `${modSet},${keySet}`.toLowerCase();
    messageWindow(`Shortcut on: ${modSet}+${keySet}`, "success");
    ztoolkit.Keyboard.register((_event: KeyboardEvent, options: any) => {
      if (options.type !== "keyup" || !options.keyboard) return;
      if (options.keyboard.equals(target)) {
        addon.hooks.renameSelectedItems();
      }
    });
  }
}

export class UIExampleFactory {
  @example
  static registerRightClickMenuItemRename() {
    const menuIcon = `chrome://${config.addonRef}/content/icons/favicon@0.5x.png`;
    const menuId = `${config.addonRef}-itemmenu-renamePDF`;

    const inject = (win: Window) => {
      const doc = win.document;
      const popup = doc.getElementById("zotero-itemmenu");
      if (!popup) return;
      if (doc.getElementById(menuId)) return;
      addon.data.ztoolkit.UI.appendElement(
        {
          tag: "menuitem",
          id: menuId,
          attributes: {
            label: getString("menuitem-renamePDF"),
            class: "menuitem-iconic",
            image: menuIcon,
          },
          listeners: [
            {
              type: "command",
              listener: () => addon.hooks.renameSelectedItems(),
            },
          ],
        },
        popup
      );
    };

    for (const win of Zotero.getMainWindows()) {
      inject(win);
    }
    ztoolkit.basicOptions.listeners.callbacks.onMainWindowLoad.add(inject);
  }
}
