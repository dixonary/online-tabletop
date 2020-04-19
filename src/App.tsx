import React, { useState, useCallback } from "react";
import { Navbar, Button, Row, Col, Container } from "react-bootstrap";
import { PlayArrow } from "@material-ui/icons";
import "./App.scss";
import testScript from "./TestScript";
import Editor from "@monaco-editor/react";
import GameRenderer from "./GameRenderer";

function App() {
  const [editorReady, setEditorReady] = useState(false);
  const [editorContent, setEditorContent] = useState(testScript);
  const [getter, setGetter] = useState<() => string>(() => "");

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
    <>
      <Navbar variant="dark" bg="dark">
        <Navbar.Brand>TTOnline</Navbar.Brand>
        <Navbar.Collapse className="justify-content-end">
          <Button as="a" disabled={!editorReady} onClick={updatePreview}>
            <PlayArrow />
          </Button>
        </Navbar.Collapse>
      </Navbar>
      <Container fluid as="main">
        <Row className="column-container">
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
            <GameRenderer sceneCode={editorContent} />
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default App;
