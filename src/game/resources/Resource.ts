import { EventHandler } from "../EventHandler";
import Log from "../Log";

class Resource {
  loaded: boolean = false;
  value: any = undefined;
  eventHandler: EventHandler = new EventHandler();
  url: string;

  constructor(url: string, confirm?: boolean) {
    this.url = url;
    if (confirm) {
      console.warn(
        "This resource was constructed directly." +
          "Consider using the.get function to cache between runs.",
        this
      );
    }
  }

  onLoad(value: any) {
    this.loaded = true;
    this.value = value;
    this.event("load", value);
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
