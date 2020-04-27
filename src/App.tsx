import React, {
  useState,
  useCallback,
  useEffect,
  useContext,
  useRef,
} from "react";
import { Navbar, Button, Row, Col, Container } from "react-bootstrap";
import { PlayArrow } from "@material-ui/icons";
import "./App.scss";
import testScript from "./TestScript";
import Editor from "@monaco-editor/react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useHistory,
  useParams,
} from "react-router-dom";
import DataController, { OTTDataContext } from "./DataContext";
import GatewayClient from "./GatewayClient";
import ConnectScreen, {
  ConnectScreenContext,
  ConnState,
} from "./ConnectScreen";

function App() {
  return (
    <Router>
      <DataController>
        <Main />
      </DataController>
    </Router>
  );
}

const Main = () => {
  const history = useHistory();

  const { setSceneCode } = useContext(OTTDataContext);

  const [editorReady, setEditorReady] = useState(false);
  const [getter, setGetter] = useState<() => string>(() => "");

  const handleMount = useCallback(
    (gv: () => string) => {
      setGetter(() => gv);
      setEditorReady(true);
    },
    [setGetter, setEditorReady]
  );

  const host = useCallback(() => {
    setSceneCode(getter());
    history.push("/setup");
  }, [getter, history, setSceneCode]);

  return (
    <>
      <Route exact path="/">
        <Navbar variant="dark" bg="dark">
          <Navbar.Brand>TTOnline</Navbar.Brand>
          <Navbar.Collapse className="justify-content-end">
            <Button as="a" disabled={!editorReady} onClick={host}>
              <PlayArrow />
            </Button>
          </Navbar.Collapse>
        </Navbar>
      </Route>

      <Container fluid as="main">
        <Row className="column-container">
          <Col md="12" className="panel">
            <Switch>
              <Route exact path="/">
                <Editor
                  value={testScript}
                  language="javascript"
                  theme="dark"
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    rulers: [80],
                  }}
                  editorDidMount={handleMount}
                />
              </Route>

              <ConnectScreen>
                <Switch>
                  <Route exact path="/setup">
                    <SetupView />
                  </Route>

                  <Route exact path="/:gameCode">
                    <LoadView />
                  </Route>
                </Switch>
              </ConnectScreen>
            </Switch>
          </Col>
        </Row>
      </Container>
    </>
  );
};

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
    <>
      <label>
        User name:
        <input
          type="text"
          value={inputUserName}
          onChange={updateUserName}
        ></input>
      </label>
      <Button
        disabled={!buttonReady || connState !== ConnState.INITIAL}
        onClick={goWithUserName}
      >
        <PlayArrow />
      </Button>
    </>
  );
};

export default App;
