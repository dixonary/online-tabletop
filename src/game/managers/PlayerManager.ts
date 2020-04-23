import TrackedObject from "../TrackedObject";
import NetworkClient from "../managers/NetworkClient";

export type PlayerData = {
  clientId: string;
};
type PlayerManagerData = {
  players: {
    [clientId: string]: PlayerData;
  };
};

class PlayerManager extends TrackedObject<PlayerManagerData> {
  private static instance: PlayerManager;

  // We don't store this in the tracked state, because it's local
  private clientId?: string;

  constructor() {
    super({ players: {} });
  }

  static Initialize() {
    PlayerManager.instance = new PlayerManager();

    // We override the definitions here to avoid a circular dependency.
    // The dependency cycle was
    // PlayerManager -> TrackedObject -> NetworkClient -> PlayerManager
    NetworkClient.UpdatePlayerList = PlayerManager.SetPlayers;
    NetworkClient.SetClientId = PlayerManager.SetClientId;
  }

  static SetPlayers(clients: { id: string }[]) {
    const playerMap: any = {};

    clients.forEach((c) => {
      playerMap[c.id] = { clientId: c.id };
    });
    PlayerManager.instance.state.players.set(playerMap, true);
  }

  static GetPlayers() {
    // Property order is deterministic so this should not vary!
    return Object.values(PlayerManager.instance.state.players.get());
  }

  static SetClientId(id: string) {
    PlayerManager.instance.clientId = id;
  }

  static GetClientId() {
    return PlayerManager.instance.clientId;
  }
}

export default PlayerManager;
