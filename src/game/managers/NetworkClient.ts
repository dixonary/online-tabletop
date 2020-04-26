import io from "socket.io-client";
import StateManager from "../managers/StateManager";
import Log from "../Log";
import Game from "../Game";
import LoadingManager from "./LoadingManager";

export enum StateMode {
  LOCAL,
  GLOBAL,
}

class NetworkClient {
  static socket: SocketIOClient.Socket;
  static roomCode: string | undefined;
  // static server = "http://142.93.46.65:3001";
  static server = "http://douglas:3001";
  static isHost = false;
  static stateMode: StateMode = StateMode.LOCAL;
  static userIdentifier: string;

  static createQueue: { className: string; params: any[] }[] = [];
  static destroyQueue: { identifier: string }[] = [];
  static stateQueue: { id: string; property: string; val: any }[] = [];

  static Initialize() {
    if (NetworkClient.socket) return;

    // We only support websockets; this ensures events will arrive
    // in the correct order.
    NetworkClient.socket = io(NetworkClient.server, {
      transports: ["websocket"],
    });

    let user = localStorage.getItem("userIdentifier");
    if (!user) {
      user = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
      localStorage.setItem("userIdentifier", user);
    }
    NetworkClient.userIdentifier = user;
    console.log(`User identifier is: ${user}`);

    const socket = NetworkClient.socket;
    socket.on("connect", (client: any) => {
      Log.Success(`Connected to ${NetworkClient.server}`);

      socket.on("authoritative_call", NetworkClient.ReceiveAuthoritativeCall);
      socket.on("state", NetworkClient.ReceiveStateUpdate);
      socket.on("create", NetworkClient.ReceiveCreation);
      socket.on("destroy", NetworkClient.ReceiveDestruction);
      socket.on("players", NetworkClient.ReceivePlayerList);
      socket.on("clientID", NetworkClient.ReceiveClientId);
      socket.on("scene", NetworkClient.ReceiveSceneCode);
      socket.on("info", Log.Info);
      socket.on("err", Log.Error);
    });

    LoadingManager.events.on("ready", NetworkClient.ApplyQueuedOperations);
  }

  static FastForward(
    creations: { className: string; params: any[] }[],
    deletions: { identifier: string }[],
    fullState: any
  ) {
    Game.instance.loadScene();

    console.log(creations);

    NetworkClient.createQueue.unshift(...creations);
    NetworkClient.destroyQueue.unshift(...deletions);
    NetworkClient.stateQueue.unshift();
    creations.forEach(({ className, params }) => {
      NetworkClient.ReceiveCreation(className, ...params);
    });

    deletions.forEach(({ identifier }) => {
      NetworkClient.ReceiveDestruction(identifier);
    });

    Object.entries(fullState).forEach(([id, state]) => {
      Object.entries(state as any).forEach(([property, val]) => {
        NetworkClient.stateQueue.unshift({ id, property, val });
      });
    });
  }

  static ApplyQueuedOperations() {
    // Compile all state changes down to only the last one for
    // each property.
    const fullState: any = {};
    NetworkClient.stateQueue.forEach(({ id, property, val }) => {
      let elem: any = fullState[id];
      if (!elem) {
        elem = {};
        fullState[id] = elem;
      }
      elem[property] = val;
    });

    // Clone the arrays; it's possible that some actions may put the
    // LoadingManager back into an unready state.
    const creations = NetworkClient.createQueue;
    const deletions = NetworkClient.destroyQueue;

    NetworkClient.createQueue = [];
    NetworkClient.destroyQueue = [];
    NetworkClient.stateQueue = [];

    // Do not propagate the state changes made while fast forwarding!
    NetworkClient.stateMode = StateMode.LOCAL;

    creations.forEach(({ className, params }) => {
      NetworkClient.ReceiveCreation(className, ...params);
    });

    deletions.forEach(({ identifier }) => {
      NetworkClient.ReceiveDestruction(identifier);
    });

    Object.entries(fullState).forEach(([identifier, state]) => {
      Object.entries(state as any).forEach(([prop, val]) => {
        NetworkClient.ReceiveStateUpdate(identifier, prop, val);
      });
    });

    NetworkClient.stateMode = StateMode.GLOBAL;
  }

  static ReceiveSceneCode(sceneCode: string) {
    Game.instance.sceneCode = sceneCode;
  }

  static Host(sceneCode: string) {
    const socket = NetworkClient.socket;
    socket.on("code", NetworkClient.ReceiveRoomCode);
    socket.on("start", () => {
      Game.instance.loadScene();
    });
    NetworkClient.isHost = true;
    socket.emit("host", sceneCode, NetworkClient.userIdentifier);
  }

  static Join(roomCode: string) {
    const socket = NetworkClient.socket;
    socket.on("start", () => {
      Game.instance.loadScene();
    });
    socket.emit("join", roomCode, NetworkClient.userIdentifier);
    socket.on("fast forward", NetworkClient.FastForward);
  }

  static ReceiveRoomCode(code: string) {
    NetworkClient.roomCode = code;
    Log.Success(`The room code is: ${code}`);
  }

  static ReceivePlayerList(clientIds: { id: string }[]) {
    //This function will be overridden by the initialization of PlayerManager.
  }
  static ReceiveClientId(id: string) {
    //This function will be overridden by the initialization of PlayerManager.
  }

  /**
   * Emit a network request which updates the state of an object.
   * @param event
   * @param data
   */
  static SendStateUpdate(id: string, property: string, newState: any) {
    if (NetworkClient.stateMode === StateMode.GLOBAL)
      NetworkClient.socket.emit("state", id, property, newState);
  }

  static ReceiveStateUpdate(id: string, property: string, val: any) {
    // console.log(id, property, val);
    if (LoadingManager.ready) StateManager.UpdateState(id, property, val);
    else NetworkClient.stateQueue.push({ id, property, val });
  }

  /* Inform the host that they should make an authoritative move. */
  static SendAuthoritativeCall(id: string, func: string, data: any) {
    // Short circuit if we are the host!
    if (NetworkClient.isHost) {
      NetworkClient.ReceiveAuthoritativeCall(id, func, data);
    } else {
      NetworkClient.socket.emit("authoritative_call", id, func, data);
    }
  }

  static ReceiveAuthoritativeCall(id: string, func: string, data: any) {
    //This function will be overridden in Authority::Initialize().
  }

  /* Creation of an object. Must be sent from the host. */
  static SendCreation(className: string, ...params: any[]) {
    // if (!NetworkClient.isHost) return;
    if (NetworkClient.stateMode === StateMode.GLOBAL)
      NetworkClient.socket.emit("create", className, ...params);
  }

  static ReceiveCreation(className: string, ...params: any[]) {
    console.log(`CREATE ${className} (${JSON.stringify(params)})`);
    if (LoadingManager.ready) StateManager.Create(className, ...params);
    else NetworkClient.createQueue.push({ className, params });
  }

  /* Destruction of an object. Must be sent from the host. */
  static SendDestruction(identifier: string) {
    if (NetworkClient.stateMode === StateMode.GLOBAL)
      NetworkClient.socket.emit("destroy", identifier);
  }
  static ReceiveDestruction(identifier: string) {
    if (LoadingManager.ready) StateManager.Destroy(identifier);
    else NetworkClient.destroyQueue.push({ identifier });
  }
}

export default NetworkClient;
