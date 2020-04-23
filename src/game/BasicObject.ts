import { Group } from "three";
import { EventHandler } from "./EventHandler";
import Game from "./Game";

/**
 * A BasicObject is anything with a lifetime.
 * Events can be set and called on it.
 * If you need coherent state, use a TrackedObject!
 * If you need standard game properties, use a GameObject!
 */
class BasicObject extends Group {
  // Events are handled here but wrapped in TrackedObject member functions.
  events: EventHandler = new EventHandler();

  constructor() {
    super();
    Game.instance.scene.add(this);
  }

  /**
   * Make changes to the object over time.
   * @param delta Time in seconds since last call.
   */
  update(delta: number) {
    // Allow for custom update hooks!
    this.events.event("update", delta);
  }

  /**
   * NOTE: Don't call this directly! Use requestKill() instead, which will
   * propagate the changes across the network.
   * Destroy the object.
   */
  kill() {
    this.dispose();
    Game.instance.scene.remove(this);
  }

  dispose() {
    this.events.event("dispose");
  }

  /* Wrap the EventHandler functions */
  event = this.events.event.bind(this.events);
}

export default BasicObject;
