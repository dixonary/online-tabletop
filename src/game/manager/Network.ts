import io from "socket.io-client";
import StateManager from "./StateManager";
import Log from "./Log";
import Game from "../Game";
import LoadingManager from "./LoadingManager";
import Manager from "./Manager";
import { PlayerData } from "./PlayerManager";
import PlayerManager from "./PlayerManager";
import JoinRequests from "./JoinRequests";

export enum StateMode {
  LOCAL,
  GLOBAL,
}

export type Creation = {
  identifier: string;
  className: string;
  params: any[];
};
export type Destruction = {
  identifier: string;
};
export type StateUpdate = {
  identifier: string;
  property: string;
  val: any;
};
export type AuthoritativeAction<K> = {
  identifier: string;
  functionName: string;
  param: K;
};

export type FullState = {
  [identifier: string]: { [propName: string]: any } | undefined;
};

class Network extends Manager {
  static socket: SocketIOClient.Socket;
  static roomCode: string | undefined;
  static server = "http://142.93.46.65:3001";
  // static server = "http://douglas:3001";
  static isHost = false;
  static stateMode: StateMode = StateMode.LOCAL;

  static createQueue: Creation[] = [];
  static destroyQueue: Destruction[] = [];
  static stateQueue: StateUpdate[] = [];

  static Initialize() {
    if (Network.socket) return;
    super.Initialize();

    // We only support websockets; this ensures events will arrive
    // in the correct order.
    Network.socket = io(Network.server, {
      transports: ["websocket"],
    });

    const socket = Network.socket;
    socket.on("connect", Network.SetupGatewayConnection);
  }

  /**
   * Navigate the gateway.
   */
  static SetupGatewayConnection(client: any) {
    Log.Info(`Connected to gateway`);
    const socket = Network.socket;

    // Set up direct logging from server
    socket.on("info", Log.Info);
    socket.on("warn", Log.Warn);
    socket.on("success", Log.Success);
    socket.on("err", Log.Error);
    socket.on("knock.ok", Network.SetupGameConnection);
    socket.on("knock.error", Log.Error);

    socket.emit("knock", PlayerManager.me);
  }

  static SetupGameConnection(client: any) {
    Log.Info(`Connected to game`);
    const socket = Network.socket;
    socket.on("setup.scene", Network.ReceiveSceneCode);
    socket.on("setup.start", Network.FastForward);
    socket.on("setup.host", Network.SetHost);
    socket.on("authority", Network.ReceiveAuthoritativeCall);
    socket.on("players", Network.ReceivePlayerList);
    socket.on("state", Network.ReceiveStateUpdate);
    socket.on("create", Network.ReceiveCreation);
    socket.on("destroy", Network.ReceiveDestruction);
    socket.on("join.request", Network.ReceiveJoinRequest);

    LoadingManager.events.on("ready", Network.ApplyQueuedOperations);
  }

  static ReceiveJoinRequest(userName: string, nonce: string) {
    const respond = (b: boolean) =>
      Network.socket.emit(`join.response.${nonce}`, b);
    JoinRequests.Add(userName, nonce, respond);
  }

  static SetHost(hostId: string) {
    Network.isHost = hostId === PlayerManager.me?.uid;
  }

  static FastForward(
    creations: Creation[],
    deletions: Destruction[],
    fullState: FullState
  ) {
    Game.instance.loadScene();

    Network.createQueue.unshift(...creations);
    Network.destroyQueue.unshift(...deletions);

    Object.entries(fullState).forEach(([identifier, state]) => {
      Object.entries(state as any).forEach(([property, val]) => {
        Network.stateQueue.unshift({ identifier, property, val });
      });
    });

    Network.ApplyQueuedOperations();
  }

  static ApplyQueuedOperations() {
    // Compile all state changes down to only the last one for
    // each property.
    const fullState: any = {};
    Network.stateQueue.forEach(({ identifier, property, val }) => {
      let elem: any = fullState[identifier];
      if (!elem) {
        elem = {};
        fullState[identifier] = elem;
      }
      elem[property] = val;
    });

    // Clone the arrays; it's possible that some actions may put the
    // LoadingManager back into an unready state.
    const creations = Network.createQueue;
    const deletions = Network.destroyQueue;

    Network.createQueue = [];
    Network.destroyQueue = [];
    Network.stateQueue = [];

    // Do not propagate the state changes made while fast forwarding!
    Network.stateMode = StateMode.LOCAL;

    creations.forEach((c) => Network.ReceiveCreation(c));

    deletions.forEach((d) => Network.ReceiveDestruction(d));

    Object.entries(fullState).forEach(([identifier, state]) => {
      Object.entries(state as any).forEach(([property, val]) => {
        Network.ReceiveStateUpdate({ identifier, property, val });
      });
    });

    Network.stateMode = StateMode.GLOBAL;
  }

  static ReceiveSceneCode(sceneCode: string) {
    Game.instance.sceneCode = sceneCode;
  }

  // static Host(sceneCode: string) {
  //   const socket = Network.socket;
  //   socket.on("code", Network.ReceiveRoomCode);
  //   socket.on("start", () => {
  //     Game.instance.loadScene();
  //   });
  //   Network.isHost = true;
  //   socket.emit("host", sceneCode, Network.userIdentifier);
  // }

  // static Join(roomCode: string) {
  //   const socket = Network.socket;
  //   socket.on("start", () => {
  //     Game.instance.loadScene();
  //   });
  //   socket.emit("join", roomCode, Network.userIdentifier);
  //   socket.on("fast forward", Network.FastForward);
  // }

  static ReceiveRoomCode(code: string) {
    Network.roomCode = code;
    Log.Success(`The room code is: ${code}`);
  }

  static ReceivePlayerList(clientIds: PlayerData[]) {
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
  static SendStateUpdate(stateUpdate: StateUpdate) {
    if (Network.stateMode === StateMode.GLOBAL)
      Network.socket.emit("state", stateUpdate);
  }

  static ReceiveStateUpdate(s: StateUpdate) {
    // console.log(id, property, val);
    if (LoadingManager.ready) StateManager.UpdateState(s);
    else Network.stateQueue.push(s);
  }

  /* Inform the host that they should make an authoritative move. */
  static SendAuthoritativeCall(action: AuthoritativeAction<any>) {
    // Short circuit if we are the host!
    if (Network.isHost) {
      Network.ReceiveAuthoritativeCall(action);
    } else {
      Network.socket.emit("authority", action);
    }
  }

  static ReceiveAuthoritativeCall(action: AuthoritativeAction<any>) {
    //This function will be overridden in Authority::Initialize().
  }

  /* Creation of an object. Must be sent from the host. */
  static SendCreation(creation: Creation) {
    // if (!Network.isHost) return;
    if (Network.stateMode === StateMode.GLOBAL)
      Network.socket.emit("create", creation);
  }

  static ReceiveCreation({ identifier, className, params }: Creation) {
    console.log(`CREATE ${className} (${JSON.stringify(params)})`);
    if (LoadingManager.ready)
      StateManager.Create({ identifier, className, params });
    else Network.createQueue.push({ identifier, className, params });
  }

  /* Destruction of an object. Must be sent from the host. */
  static SendDestruction(destruction: Destruction) {
    if (Network.stateMode === StateMode.GLOBAL)
      Network.socket.emit("destroy", destruction);
  }
  static ReceiveDestruction(destruction: Destruction) {
    if (LoadingManager.ready) StateManager.Destroy(destruction);
    else Network.destroyQueue.push(destruction);
  }
}

export default Network;
