import { Object3D } from "three";
import Game from "./Game";

export enum LogLevel {
  INFO,
  WARN,
  ERROR,
  SUCCESS,
}

class Log extends Object3D {
  static instance: Log;
  root: HTMLElement;
  messages: Message[] = [];
  // Visual gap between items
  gap: number = 5;

  static Initialize(root: HTMLElement) {
    Log.instance = new Log(root);
    Game.instance.scene.add(Log.instance);
  }

  constructor(root: HTMLElement) {
    super();
    this.root = document.createElement("div") as HTMLElement;
    this.root.classList.add("log");
    root.appendChild(this.root);
  }

  update() {
    // Do update step
    this.messages.forEach((m) => m.update());
  }

  static Info = (e: any) => Log.instance.info(e, LogLevel.INFO);
  static Warn = (e: any) => Log.instance.warn(e, LogLevel.WARN);
  static Error = (e: any) => Log.instance.error(e, LogLevel.ERROR);
  static Success = (e: any) => Log.instance.success(e, LogLevel.SUCCESS);

  info = this.log.bind(this);
  error = this.log.bind(this);
  warn = this.log.bind(this);
  success = this.log.bind(this);

  log(e: any, level: LogLevel) {
    let message = new Message(this, e, level);
    this.root.appendChild(message.elem);

    const h = message.elem.clientHeight;
    // start it at the bottom, now we're here
    message.position = (this.messages[0]?.position ?? 0) - h;
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
      case LogLevel.SUCCESS:
        elem.classList.add("success");
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
