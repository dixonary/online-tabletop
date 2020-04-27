import React, { useState, useCallback } from "react";
import GameRenderer from "./GameRenderer";

export enum ConnState {
  INITIAL,
  CONNECTING,
  CONNECTED,
  FAIL,
}

export type ConnectScreenData = {
  logAppend: (s: string) => void;
  logLines: string[];
  connState: ConnState;
  setConnState: (c: ConnState) => void;
};

const defaultCS = {
  logAppend: () => {},
  logLines: [],
  connState: ConnState.INITIAL,
  setConnState: () => {},
};

const ConnectScreenContext = React.createContext<ConnectScreenData>(defaultCS);

const ConnectScreen = ({ children }: { children: React.ReactNode }) => {
  const [logLines, setLogLines] = useState<string[]>([]);
  const [connState, setConnState] = useState<ConnState>(ConnState.INITIAL);

  const logAppend = useCallback(
    (s: string) => {
      setLogLines((l) => [...l, s]);
    },
    [setLogLines]
  );

  const context = { logLines, logAppend, connState, setConnState };

  return connState === ConnState.CONNECTED ? (
    <GameRenderer />
  ) : (
    <ConnectScreenContext.Provider value={context}>
      <div className="connection-screen">
        {children}
        <div className="connection-log">
          {logLines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      </div>
    </ConnectScreenContext.Provider>
  );
};

export default ConnectScreen;
export { ConnectScreenContext };
