import React, { useState } from "react";
import testScript from "./TestScript";

export type OTTData = {
  sceneCode: string;
  userName: string | null;
  setSceneCode: (newSceneCode: string) => void;
  setUserName: (newUserName: string | null) => void;
  uid: string;
};

const params = new URLSearchParams(window.location.search);
const defaultOTTData: OTTData = {
  sceneCode: testScript,
  userName: params.get("name"),
  setSceneCode: () => {},
  setUserName: () => {},
  uid: "",
};

export const OTTDataContext = React.createContext(defaultOTTData);
/**
 * The DataController manages all the state of the system which it needs to know
 * in order to host or join a room.
 * @param props React node properties.
 */
const DataController = ({ children }: { children: React.ReactNode }) => {
  const params = new URLSearchParams(window.location.search);

  const [sceneCode, setSceneCode] = useState<string>(testScript);
  const [userName, setUserName] = useState<string | null>(
    params.get("name") ?? localStorage.getItem("userName")
  );

  // Grab the data from local storage, or generate some random stuff.
  let uid = localStorage.getItem("uid");
  if (!uid) {
    uid = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
    localStorage.setItem("playerData", uid);
  }

  const setUserNameAndStore = (x: string | null) => {
    localStorage.setItem("userName", x!);
    setUserName(x);
  };

  const allOttData = {
    sceneCode,
    setSceneCode,
    userName,
    setUserName: setUserNameAndStore,
    uid,
  };

  return (
    <OTTDataContext.Provider value={allOttData}>
      {children}
    </OTTDataContext.Provider>
  );
};

export default DataController;
