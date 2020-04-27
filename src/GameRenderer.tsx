import { useRef, useEffect } from "react";
import Game from "./game/Game";
import React from "react";

const GameRenderer = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  // Use this effect exactly once to initialise the game
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const createGame = () => {
      gameRef.current = new Game(root);
    };

    const destroyGame = () => {
      gameRef.current?.dispose();
      gameRef.current = null;
    };

    createGame();
    return destroyGame;
  }, []);

  return <div ref={rootRef} className="gamePreview" id="game-target"></div>;
};

export default GameRenderer;
