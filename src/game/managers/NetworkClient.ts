import io from "socket.io-client";
import StateManager from "../managers/StateManager";
import Log from "../Log";
import Game from "../Game";

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
      socket.on("info", Log.Info);
      socket.on("err", Log.Error);
    });
  }

  static Host(sceneCode: string) {
    const socket = NetworkClient.socket;
    socket.on("code", NetworkClient.ReceiveRoomCode);
    socket.on("scene", (sc: string) => {
      Game.instance.sceneCode = sc;
    });
    socket.on("start", () => {
      Game.instance.loadScene();
    });
    NetworkClient.isHost = true;
    socket.emit("host", sceneCode);
  }

  static Join(roomCode: string) {
    const socket = NetworkClient.socket;
    socket.on("scene", (sc: string) => {
      Game.instance.sceneCode = sc;
    });
    socket.on("start", () => {
      Game.instance.loadScene();
    });
    socket.emit("join", roomCode, NetworkClient.userIdentifier);
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
    // Log.Info(`-> ${id} :: ! ${JSON.stringify(newState)}`);
    if (NetworkClient.stateMode === StateMode.GLOBAL)
      NetworkClient.socket.emit("state", id, property, newState);
  }

  static ReceiveStateUpdate(id: string, property: string, newState: any) {
    //Log.Info(`<- ${id} :: ! ${JSON.stringify(newState)}`);
    StateManager.UpdateState(id, property, newState);
  }

  /* Inform the host that they should make an authoritative move. */
  static SendAuthoritativeCall(id: string, func: string, data: any) {
    // Log.Info(`-> ${id} :: ? ${func}(${JSON.stringify(data)})`);

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
  static SendCreation(objectName: string, ...params: any[]) {
    if (!NetworkClient.isHost) return;
    // Log.Info(`-> ${objectName} :: Create`);
    NetworkClient.socket.emit("create", objectName, ...params);
  }

  static ReceiveCreation(objectName: string, ...params: any[]) {
    // Log.Info(`<- ${objectName} :: Create`);
    StateManager.Create(objectName, ...params);
  }

  /* Destruction of an object. Must be sent from the host. */
  static SendDestruction(id: string) {
    NetworkClient.socket.emit("destroy", id);
  }
  static ReceiveDestruction(id: string) {
    StateManager.Destroy(id);
  }
}

export default NetworkClient;
