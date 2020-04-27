import React, { useState, useCallback, useContext } from "react";
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
} from "react-router-dom";
import DataController, { OTTDataContext } from "./DataContext";
import ConnectScreen from "./ConnectScreen";
import { SetupView, LoadView } from "./ConnectViews";

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

export default App;
