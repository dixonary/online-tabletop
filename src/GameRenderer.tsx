import { useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import Game, { GameMode } from "./game/Game";
import React from "react";

const GameRenderer = ({
  mode,
  sceneCode,
}: {
  mode: GameMode;
  sceneCode?: string;
}) => {
  const { roomCode } = useParams();

  const rootRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  // Use this effect exactly once to initialise the game
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const createGame = () => {
      gameRef.current = new Game(root, mode);
    };

    const destroyGame = () => {
      gameRef.current?.dispose();
      gameRef.current = null;
    };

    createGame();
    return destroyGame;
  }, [mode]);

  // When the scene changes, run this one
  useEffect(() => {
    if (!gameRef.current) return;

    const loadGame = () => {
      const game = gameRef.current!;
      if (mode === GameMode.JOIN) game.joinRoom(roomCode!);
      else if (mode === GameMode.HOST) game.hostRoom(sceneCode!);
    };
    const unloadGame = () => {
      const game = gameRef.current;
      if (game) game.unloadScene();
    };

    loadGame();
    return unloadGame;
  }, [roomCode, sceneCode, mode, gameRef]);

  return <div ref={rootRef} className="gamePreview" id="game-target"></div>;
};

export default GameRenderer;
