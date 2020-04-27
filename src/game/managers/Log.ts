import Manager from "./Manager";

export enum LogLevel {
  INFO,
  WARN,
  ERROR,
  SUCCESS,
}

class Log extends Manager {
  static _root: HTMLElement;
  static _elem: HTMLDivElement;
  static _messages: Message[] = [];

  // Visual gap between items
  static gap: number = 5;

  static Initialize(root: HTMLElement) {
    super.Initialize();
    Log._root = root;
    Log._elem = document.createElement("div") as HTMLDivElement;
    Log._elem.classList.add("log");
    Log._root.appendChild(Log._elem);
  }

  static Update(delta: number) {
    super.Update(delta);
    // Do update step
    Log._messages.forEach((m) => m.update(delta));
  }

  static Info = (e: any) => Log._log(e, LogLevel.INFO);
  static Warn = (e: any) => Log._log(e, LogLevel.WARN);
  static Error = (e: any) => Log._log(e, LogLevel.ERROR);
  static Success = (e: any) => Log._log(e, LogLevel.SUCCESS);

  /**
   * Helper function which logs something. Use the
   * [Info, Warn, Error, Success] functions rather than this one!
   * @param e
   * @param level
   */
  static _log(e: any, level: LogLevel) {
    let message = new Message(e, level);
    Log._elem.appendChild(message.elem);

    const h = message.elem.clientHeight;
    // start it at the bottom, now we're here
    message.position = (Log._messages[0]?.position ?? 0) - h;
    Log._messages.forEach((m) => m.adjust(Log.gap + h));
    message.adjust(Log.gap);
    Log._messages.unshift(message);

    console.log(e);
  }

  /**
   * Remove a particular child from the message list.
   * @param child The child to remove.
   */
  static KillMessage(child: Message) {
    Log._messages = Log._messages.filter((x) => x !== child);
    Log._elem.removeChild(child.elem);
  }
}

class Message {
  targetPosition: number = 0;
  position: number = 0;

  age: number = 0;

  static Lifetime: number = 5.5;
  static Fadetime: number = 0.5;

  elem: HTMLDivElement;

  constructor(message: any, level: LogLevel) {
    const elem = document.createElement("div") as HTMLDivElement;
    elem.classList.add("message");

    elem.innerText = `${message}`;

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

  update(delta: number) {
    this.age += delta;
    if (this.age > Message.Lifetime) {
      const fadePct = (this.age - Message.Lifetime) / Message.Fadetime;
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
    Log.KillMessage(this);
  }
}

export default Log;
