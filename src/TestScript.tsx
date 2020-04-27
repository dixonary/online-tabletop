const testScript = `
/******************************************************************************/
/*                          Set up constants                                  */

const cardNames = 
  [ 'guard'
  , 'priest'
  , 'baron'
  , 'handmaid'
  , 'prince'
  , 'king'
  , 'countess'
  , 'princess'
  ];

const TABLE_HEIGHT = 1;

const seatController = new controller.SeatController([
  {
    position: {x:0, y:TABLE_HEIGHT+0.5, z:0.5}
  },
  {
    position: {x:0, y:TABLE_HEIGHT+0.5, z:-0.5}
  }
],
  {x:0, y:TABLE_HEIGHT, z:0}
);

const handController = new controller.HandController([
  {
    pos: {x:0, y:TABLE_HEIGHT, z:0.4},
    quat: struct.AxisAngle({...struct.Up, angle:0})
  },
  {
    pos: {x:0, y:TABLE_HEIGHT, z:-0.4},
    quat: struct.AxisAngle({...struct.Up, angle:Math.PI})
  },
]);


/******************************************************************************/
/*                          Resources                                         */

const cardFronts = new resource.TextureList(
  name => \`${process.env.PUBLIC_URL}/resources/ll/\${name}.png\`,
  cardNames);

const cardBack = resource.Texture.get("${process.env.PUBLIC_URL}/resources/ll/back.png");


/******************************************************************************/
/*                         Game components                                    */

const tabletop = new component.Tabletop({
  width: 1,
  height: TABLE_HEIGHT,
  depth:1
});

const deck = new component.PopulatedDeck ({
  cardFronts,
  cardBack,
  distribution: {
    guard: 5,
    priest: 2,
    baron: 2,
    handmaid: 2,
    prince: 2,
    king: 1,
    countess:1,
    princess:1
  },
  faceDown:true,
  pos: {x:0, y:TABLE_HEIGHT, z:0.1}
});

// const endTurnImg = new resource.Image(
//   "localhost:3000/resources/nextTurn.png"
// )
// const endTurnButton = new Button({asset: endTurnImg,tooltip: "End turn"});

// const loseImg = new resource.Image(
//   "localhost:3000/resources/lose.png"
// );
// const loseButton = new Button({ asset: loseImg, tooltip: "Lose" });

// const youWinText  = new Text({ text: "You win!" });
// const youLoseText = new Text({ text: "You lost! Thanks for playing." });

// const discard = Deck.empty({faceUp:true});
// discard.setPosition(0.4, 0.5);

// const sidebar = Deck.empty({faceUp:true});
// sidebar.setPosition(0.3, 0.5);

// const hands = new HandManager({ maxHandSize: 2 });
// const turn  = new TurnManager();



// /******************************************************************************/
// /*                              Event listeners                               */

// const initialise = ({turn, tabletop, deck, players, state}) => {
//   players.forEach((player) => {
//     let [card] = deck.draw(1);
//     hands.getHand(player).add(card, {secret: true});
//   });

//   let [card] = deck.draw(1);
//   sidebar.add(card, {secret: true});

//   turn.setPlayers(players);
//   turn.setCurrent(turns.getFirst());

//   state.playerHasDrawnCard = false;
//   state.playerHasDiscarded = false;
// };

// deck.on('draw', ({turn, player, card, hands, state}) => {
//   if(turn.current !== player) return false;
//   if(state.playerHasDrawnCard) return false;
//   if(hands.getHand(player).isFull) return false;

//   state.playerHasDrawnCard = true;
//   hands.getHand(player).droppable = true;
//   return true;
// });

// hands.on('drop', ({turn, player, card, state}) => {
//   if(turn.current !== player)   return false;
//   if(!state.playerHasDrawnCard) return false;

//   hands.getHand(player).droppable = false;
//   return true;
// });

// hands.on('take', ({turn, player, card, state}) => {
//   if(!state.playerHasDrawnCard) return false;
//   return true;
// });

// // Placing a card into the discard
// discard.on('drop', ({state}) => {
//   if(!state.playerHasDrawnCard) return false;
//   return true;
// });

// // When the end turn button should appear
// endTurnButton.visible = ({turn, clientId, state}) => {
//   return turn.currentPlayer.id === clientId;
// }

// // When the end turn button is clicked
// endTurnButton.on('press', ({turn, clientId, state}) => {
//   if(turn.currentPlayer.id !== clientId) return false;
//   if(!state.playerHasDiscarded)          return false;

//   turn.next();
//   return true;
// });

// // When the end turn button is clicked
// endTurnButton.on('press', ({turn, clientId}) => {
//   if(turn.turnOrder.indexOf(clientId) === -1) return false;
//   turn.removeFromTurnOrder(clientId);
//   return true;
// });

// // Runs every time a new turn starts
// turn.on('start', ({state}) => {
//   state.playerHasDiscarded = false;
//   state.playerHasDrawnCard = false;
// }); 

// endTurnButton.visible = ({turn, clientId}) => 
//   turn.turnOrder.indexOf(clientId) !== -1;

// youWinText.visible = ({turn, clientId}) => 
//   turn.turnOrder.length === 1 && turn.turnOrder[0] == clientId;

// youLoseText.visible = ({turn, clientId}) => 
//   turn.turnOrder.indexOf(clientId) === -1;
`;

export default testScript;
