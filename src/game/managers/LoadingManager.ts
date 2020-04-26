import Log from "../Log";
import { EventHandler } from "../EventHandler";

/**
 * Reports back when all geometries, textures, etc. have been loaded
 * from the network.
 */
class LoadingManager {
  static ready: boolean = true;

  static events: EventHandler = new EventHandler();

  static loading: Set<string> = new Set();
  static allResources: string[] = [];

  static Initialize() {}

  static NewLoadingSession() {
    LoadingManager.ready = false;
  }

  static AddResource(url: string) {
    LoadingManager.loading.add(url);
    LoadingManager.allResources.push(url);
    LoadingManager.ready = false;
  }

  static DoneResource(url: string) {
    LoadingManager.loading.delete(url);

    const all = LoadingManager.allResources.length;
    Log.Info(`Loaded ${all - LoadingManager.loading.size} / ${all}`);

    if (LoadingManager.loading.size === 0) {
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
