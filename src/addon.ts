// @ts-ignore
import { ZoteroToolkit } from "zotero-plugin-toolkit/ztoolkit";
import hooks from "./hooks";

class Addon {
  public data: {
    alive: boolean;
    env: "development" | "production";
    ztoolkit: ZoteroToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
      columns: Array<any>;
      rows: Array<{ [dataKey: string]: string }>;
    };
    dialog?: any;
  };
  public hooks: typeof hooks;
  public api: object;

  constructor() {
    this.data = {
      alive: true,
      env: __env__,
      ztoolkit: new ZoteroToolkit(),
    };
    this.hooks = hooks;
    this.api = {};
  }
}

export default Addon;
