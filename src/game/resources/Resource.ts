import { EventHandler } from "../EventHandler";
import Log from "../Log";
import LoadingManager from "../managers/LoadingManager";

class Resource {
  loaded: boolean = false;
  value: any = undefined;
  eventHandler: EventHandler = new EventHandler();
  url: string;
  slowLoader: boolean;

  constructor(url: string, slowLoader: boolean, confirm?: boolean) {
    this.url = url;
    if (confirm) {
      console.warn(
        "This resource was constructed directly." +
          "Consider using the.get function to cache between runs.",
        this
      );
    }

    if (slowLoader) LoadingManager.AddResource(url);
    this.slowLoader = slowLoader;
  }

  onLoad(value: any) {
    this.loaded = true;
    this.value = value;
    this.event("load", value);
    if (this.slowLoader) LoadingManager.DoneResource(this.url);
  }

  /* Wrap the EventHandler functions */
  on = this.eventHandler.on.bind(this.eventHandler);
  once = this.eventHandler.once.bind(this.eventHandler);
  off = this.eventHandler.off.bind(this.eventHandler);
  event = this.eventHandler.event.bind(this.eventHandler);

  loadingError(err: any) {
    Log.Error("Couldn't load the following resource:\n" + this.url + "\n");
    this.decache();
  }

  decache() {}
}

export default Resource;
