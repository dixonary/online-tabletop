import React, { useState, useCallback, useEffect } from "react";
import { Navbar, Button, Row, Col, Container } from "react-bootstrap";
import { PlayArrow } from "@material-ui/icons";
import "./App.scss";
import testScript from "./TestScript";
import Editor from "@monaco-editor/react";
import GameRenderer from "./GameRenderer";
import { GameMode } from "./game/Game";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

function App() {
  const [editorReady, setEditorReady] = useState(false);
  const [editorContent, setEditorContent] = useState(testScript);
  const [getter, setGetter] = useState<() => string>(() => "");
  const [userKey, setUserKey] = useState<string>("");

  const handleMount = useCallback(
    (gv: () => string) => {
      setGetter(() => gv);
      setEditorReady(true);
    },
    [setGetter, setEditorReady]
  );

  const updatePreview = useCallback(() => {
    setEditorContent(getter());
  }, [getter, setEditorContent]);

  return (
    <Router>
      <Route exact path="/">
        <Navbar variant="dark" bg="dark">
          <Navbar.Brand>TTOnline</Navbar.Brand>
          <Navbar.Collapse className="justify-content-end">
            <Button as="a" disabled={!editorReady} onClick={updatePreview}>
              <PlayArrow />
            </Button>
          </Navbar.Collapse>
        </Navbar>
      </Route>

      <Container fluid as="main">
        <Row className="column-container">
          <Switch>
            <Route exact path="/">
              <Col md="6" className="left panel">
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
              </Col>
              <Col md="6" className="right panel">
                <GameRenderer mode={GameMode.HOST} sceneCode={editorContent} />
              </Col>
            </Route>

            <Route path="/:roomCode">
              <GameRenderer mode={GameMode.JOIN} />
            </Route>
          </Switch>
        </Row>
      </Container>
    </Router>
  );
}

export default App;
