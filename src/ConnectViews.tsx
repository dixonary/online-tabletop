import { useContext, useRef, useEffect, useState, useCallback } from "react";
import { ConnectScreenContext, ConnState } from "./ConnectScreen";
import { OTTDataContext } from "./DataContext";
import GatewayClient from "./GatewayClient";
import { useHistory, useParams } from "react-router-dom";
import { Button, InputGroup, FormControl } from "react-bootstrap";
import { PlayArrow } from "@material-ui/icons";
import React from "react";

/**
 * The Game client controller which sets up a game.
 * It uses the scene code stored in the OTTDataContext.
 */
const SetupView = () => {
  const { logAppend } = useContext(ConnectScreenContext);
  const { sceneCode } = useContext(OTTDataContext);
  const clientRef = useRef<GatewayClient>();
  const history = useHistory();

  useEffect(() => {
    if (clientRef.current) return;

    logAppend("Setting up game...");

    const client = new GatewayClient();

    client.events.on("setup.error", (e) => logAppend(e));
    client.events.on("setup.ok", (code) => {
      logAppend(`Game Code: ${code}`);
      history.replace(`/${code}`);
    });

    client.setup(sceneCode);

    clientRef.current = client;

    return () => {
      client.events.off("setup.error");
      client.events.off("setup.ok");
    };
  }, [sceneCode, clientRef, logAppend, history]);

  return <></>;
};

/**
 * The Gateway client controller which joins a game.
 * It will ask for a username and then pass that through into the join request.
 */
const LoadView = () => {
  const { logAppend, connState, setConnState } = useContext(
    ConnectScreenContext
  );
  const { uid } = useContext(OTTDataContext);

  const gameCode = (useParams() as any).gameCode;

  const clientRef = useRef<GatewayClient>();

  const [inputUserName, setInputUserName] = useState("");
  const [userName, setUserName] = useState("");
  const [buttonReady, setButtonReady] = useState(false);

  const updateUserName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.currentTarget.value;
      setInputUserName(e.currentTarget.value);
      setButtonReady(val.length > 2 && val.length <= 15);
    },
    []
  );

  const goWithUserName = useCallback(() => {
    setUserName(inputUserName);
  }, [inputUserName]);

  useEffect(() => {
    if (!userName) return;
    if (!gameCode) return;
    if (clientRef.current) return;

    // Create gateway
    clientRef.current = new GatewayClient();
    const client = clientRef.current;

    setConnState(ConnState.CONNECTING);
    logAppend(`Connecting to game '${gameCode}'...`);

    // Store the uid and username with which we are connecting
    localStorage.setItem("userName", userName);
    localStorage.setItem("uid", uid);

    client.events.on("join.ok", () => {
      logAppend("Connection accepted!");
      setConnState(ConnState.CONNECTED);
    });
    client.events.on("join.pending", () =>
      logAppend("Waiting for response...")
    );
    client.events.on("join.error", (e) => {
      logAppend(e);
      setConnState(ConnState.FAIL);
    });
    client.events.on("join.rejected", (e) => {
      logAppend("The host declined your request to join.");
      setConnState(ConnState.FAIL);
    });

    client.join(gameCode, uid, userName);

    return () => {
      client.events.off("join.ok");
      client.events.off("join.pending");
      client.events.off("join.error");
      client.events.off("join.rejected");
    };
  }, [logAppend, userName, gameCode, uid, setConnState]);

  return (
    <div className="login-form">
      <InputGroup>
        <InputGroup.Prepend>
          <InputGroup.Text>User name:</InputGroup.Text>
        </InputGroup.Prepend>

        <FormControl
          type="text"
          className="username-input"
          value={inputUserName}
          onChange={updateUserName}
        />
        <InputGroup.Append>
          <Button
            disabled={!buttonReady || connState !== ConnState.INITIAL}
            onClick={goWithUserName}
          >
            <PlayArrow />
          </Button>
        </InputGroup.Append>
      </InputGroup>
    </div>
  );
};

export { SetupView, LoadView };
