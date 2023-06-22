import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { renameSelectedItems } from "./rename";

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
    const prefOptions = {
      pluginID: config.addonID,
      src: rootURI + "chrome/content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${config.addonRef}/content/icons/favicon.png`,
      defaultXUL: true,
    };
    ztoolkit.PreferencePane.register(prefOptions);
  }
}

export class KeyExampleFactory {
  @example
  static registerRenameShortcuts() {
    const keysetId = `${config.addonRef}-keyset`;
    const cmdsetId = `${config.addonRef}-cmdset`;
    const cmdRenameId = `${config.addonRef}-cmd-rename`;
    // Register an event key for Ctrl+D
    ztoolkit.Shortcut.register("event", {
      id: `${config.addonRef}-key-rename`,
      key: "D",
      modifiers: "control",
      callback: (keyOptions) => {
        addon.hooks.renameSelectedItems();
      },
    });
  }



  @example
  static exampleShortcutConflictingCallback() {
    const conflictingGroups = ztoolkit.Shortcut.checkAllKeyConflicting();
    new ztoolkit.ProgressWindow("Check Key Conflicting")
      .createLine({
        text: `${conflictingGroups.length} groups of conflicting keys found. Details are in the debug output/console.`,
      })
      .show(-1);
    ztoolkit.log(
      "Conflicting:",
      conflictingGroups,
      "All keys:",
      ztoolkit.Shortcut.getAll()
    );
  }
}

export class UIExampleFactory {
  @example
  static registerRightClickMenuItemRename() {
    const menuIcon = `chrome://${config.addonRef}/content/icons/favicon@0.5x.png`;
    // item menuitem with icon
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-itemmenu-renamePDF",
      label: getString("menuitem-renamePDF"),
      commandListener: (ev) => addon.hooks.renameSelectedItems(),
      icon: menuIcon,
    });
  }
}

export class HelperExampleFactory {
  @example
  static progressWindowExample() {
    new ztoolkit.ProgressWindow(config.addonName)
      .createLine({
        text: "ProgressWindow Example!",
        type: "success",
        progress: 100,
      })
      .show();
  }

  @example
  static vtableExample() {
    ztoolkit.getGlobal("alert")("See src/modules/preferenceScript.ts");
  }
}
