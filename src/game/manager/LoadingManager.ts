import Log from "./Log";
import { EventHandler } from "../EventHandler";
import Manager from "./Manager";

/**
 * Reports back when all geometries, textures, etc. have been loaded
 * from the network.
 */
class LoadingManager extends Manager {
  static ready: boolean = true;

  static events: EventHandler = new EventHandler();

  static _loading: Set<string> = new Set();
  static _allResources: string[] = [];

  static Initialize() {
    super.Initialize();
  }

  static Dispose() {
    super.Dispose();
    LoadingManager.events.clear();
  }

  static NewLoadingSession() {
    LoadingManager.ready = false;
  }

  static AddResource(url: string) {
    LoadingManager._loading.add(url);
    LoadingManager._allResources.push(url);
    LoadingManager.ready = false;
  }

  static DoneResource(url: string) {
    LoadingManager._loading.delete(url);

    const all = LoadingManager._allResources.length;
    Log.Info(`Loaded ${all - LoadingManager._loading.size} / ${all}`);

    if (LoadingManager._loading.size === 0) {
      console.log(LoadingManager.ready);
      LoadingManager.ready = true;
      console.log(LoadingManager.ready);
      Log.Success("All resouces loaded");
      LoadingManager.events.event("ready");

      console.log(LoadingManager.ready);
    }
  }
}

export default LoadingManager;
