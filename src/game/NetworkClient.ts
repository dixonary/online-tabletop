import io from "socket.io-client";
import { StateController } from "./StateMachine";
import Log from "./Log";
import GameRunner from "./GameRunner";

type Player = {
  id: string;
};

class NetworkClient {
  static socket: SocketIOClient.Socket;
  static roomCode: string | undefined;
  // static server = "http://142.93.46.65:3001";
  static server = "http://localhost:3001";
  static players: Player[];
  static clientID: string;

  static Initialize() {
    if (NetworkClient.socket) return;
    NetworkClient.socket = io(NetworkClient.server, {
      transports: ["websocket"],
    });
    const socket = NetworkClient.socket;
    socket.on("connect", (client: any) => {
      Log.Success(`Connected to ${NetworkClient.server}`);

      socket.on("request", NetworkClient.ReceiveRequest);
      socket.on("state", NetworkClient.ReceiveStateUpdate);
      socket.on("create", NetworkClient.CreateObject);
      socket.on("destroy", NetworkClient.DestroyObject);
      socket.on("players", NetworkClient.UpdatePlayerList);
      socket.on("clientID", NetworkClient.SetClientID);
      socket.on("info", Log.Info);
      socket.on("err", Log.Error);
    });
  }

  static Host(sceneCode: string, runner: GameRunner) {
    const socket = NetworkClient.socket;
    socket.once("code", NetworkClient.ReceiveRoomCode);
    socket.once("scene", (sc: string) => {
      runner.sceneCode = sc;
    });
    socket.once("start", () => {
      runner.loadScene();
    });
    socket.emit("host", sceneCode);
  }

  static Join(roomCode: string, runner: GameRunner) {
    const socket = NetworkClient.socket;
    socket.once("scene", (sc: string) => {
      runner.sceneCode = sc;
    });
    socket.once("start", () => {
      runner.loadScene();
    });
    socket.emit("join", roomCode);
  }

  static ReceiveRoomCode(code: string) {
    NetworkClient.roomCode = code;
    Log.Success(`The room code is: ${code}`);
  }

  static UpdatePlayerList(players: Player[]) {
    NetworkClient.players = players;
  }
  static SetClientID(id: string) {
    NetworkClient.clientID = id;
  }

  /**
   * Emit a network request which updates the state of an object.
   * @param event
   * @param data
   */
  static SendStateUpdate(id: string, newState: any) {
    //Log.Info(`-> ${id} :: ! ${JSON.stringify(newState)}`);
    NetworkClient.socket.emit("state", id, newState);
  }
  static ReceiveStateUpdate(id: string, newState: any) {
    //Log.Info(`<- ${id} :: ! ${JSON.stringify(newState)}`);
    StateController.UpdateState(id, newState);
  }
  static SendRequest(id: string, event: string, data: any) {
    Log.Info(`-> ${id} :: ? ${event}`);
  }
  static ReceiveRequest(id: string, event: string, data: any) {
    Log.Info(`<- ${id} :: ? ${event}`);
  }

  static CreateObject(objectName: string, nonce: string, ...params: any[]) {
    StateController.Create(objectName, nonce, ...params);
  }

  static DestroyObject(id: string) {
    StateController.Destroy(id);
  }

  static SendCreation(objectName: string, nonce: string, ...params: any[]) {
    NetworkClient.socket.emit("create", objectName, nonce, ...params);
  }

  static SendDestroy(id: string) {
    NetworkClient.socket.emit("destroy", id);
  }
}

export default NetworkClient;
