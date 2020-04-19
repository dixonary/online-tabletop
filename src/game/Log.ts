import { Object3D } from "three";
import { GlobalAccess } from "../GameRenderer";

export enum LogLevel {
  INFO,
  WARN,
  ERROR,
}

class Log extends Object3D {
  static instance: Log;
  root: HTMLDivElement;
  messages: Message[] = [];
  // Visual gap between items
  gap: number = 5;

  static Initialize(root: HTMLDivElement) {
    Log.instance = new Log(root);
    const { scene } = (window as any) as GlobalAccess;
    scene.add(Log.instance);
  }

  static Error(e: any) {
    Log.instance.error(e);
  }

  static Info(e: any) {
    Log.instance.info(e);
  }

  constructor(root: HTMLDivElement) {
    super();
    this.root = document.createElement("div") as HTMLDivElement;
    this.root.classList.add("log");
    root.appendChild(this.root);
  }

  update() {
    // Do update step
    this.messages.forEach((m) => m.update());
  }

  error(e: any) {
    this.log(e, LogLevel.ERROR);
  }

  info(e: any) {
    this.log(e, LogLevel.INFO);
  }

  log(e: any, level: LogLevel) {
    let message = new Message(this, e, level);
    this.root.appendChild(message.elem);

    const h = message.elem.clientHeight;
    // start it at the bottom, now we're here
    message.position = -h;
    this.messages.forEach((m) => m.adjust(this.gap + h));
    message.adjust(this.gap);
    this.messages.unshift(message);
  }

  killMessage(child: Message) {
    this.messages = this.messages.filter((x) => x !== child);
    this.root.removeChild(child.elem);
  }
}

class Message {
  created: number;
  targetPosition: number = 0;
  position: number = 0;
  parent: Log;

  static Lifetime: number = 5.5;
  static Fadetime: number = 0.5;

  elem: HTMLDivElement;

  constructor(parent: Log, message: any, level: LogLevel) {
    const elem = document.createElement("div") as HTMLDivElement;
    elem.classList.add("message");

    elem.innerText = `${message}`;

    this.created = Date.now();
    this.parent = parent;

    switch (level) {
      case LogLevel.INFO:
        elem.classList.add("info");
        break;
      case LogLevel.WARN:
        elem.classList.add("warn");
        break;
      case LogLevel.ERROR:
        elem.classList.add("error");
        break;
    }

    this.elem = elem;
  }

  adjust(x: number) {
    this.targetPosition += x;
  }

  update() {
    const timeSinceCreated = (Date.now() - this.created) / 1000;
    if (timeSinceCreated > Message.Lifetime) {
      const fadePct = (timeSinceCreated - Message.Lifetime) / Message.Fadetime;
      this.elem.style.opacity = `${1 - fadePct}`;
      if (fadePct > 1) {
        this.dispose();
      }
    }

    this.position += (this.targetPosition - this.position) / 5;
    if (Math.abs(this.targetPosition - this.position) < 0.5) {
      this.position = this.targetPosition;
    }
    this.elem.style.bottom = `${this.position}px`;
  }

  dispose() {
    this.parent.killMessage(this);
  }
}

export default Log;
