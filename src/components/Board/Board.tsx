import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { getPieceImg } from "../../lib/pieceAssets";
import "./board.css";

/* ================= TYPES ================= */

type Selected = { from: Square; legalTargets: Square[] } | null;

type GameEnd =
  | { kind: "none" }
  | { kind: "checkmate"; winner: "White" | "Black" }
  | { kind: "draw" }
  | { kind: "timeout"; winner: "White" | "Black" };

const FILES = ["a","b","c","d","e","f","g","h"] as const;

const PIECE_VALUE: Record<string, number> = { p:1,n:3,b:3,r:5,q:9 };

const TIME_PRESETS = [
  { label: "1:00", ms: 60_000 },
  { label: "3:00", ms: 180_000 },
  { label: "5:00", ms: 300_000 },
  { label: "10:00", ms: 600_000 }
];

/* ================= HELPERS ================= */

function buildSquares(): Square[] {
  const s: Square[] = [];
  for (let r=8;r>=1;r--) for (const f of FILES) s.push(`${f}${r}` as Square);
  return s;
}

function formatMs(ms:number){
  const t=Math.max(0,ms);
  const s=Math.floor(t/1000);
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

function materialScore(arr:string[]){
  return arr.reduce((s,p)=>s+(PIECE_VALUE[p]??0),0);
}

/* ================= BOT ================= */

function pickBotMove(g:Chess){
  const moves=g.moves({verbose:true});
  let best=moves[0], bestScore=Infinity;
  for(const m of moves){
    const n=new Chess(g.fen());
    n.move(m);
    let score=0;
    for(const row of n.board()){
      for(const p of row){
        if(!p)continue;
        score+=(PIECE_VALUE[p.type]??0)*(p.color==="w"?1:-1);
      }
    }
    if(score<bestScore){bestScore=score;best=m;}
  }
  return best;
}

/* ================= COMPONENT ================= */

export default function Board(){
  const [game,setGame]=useState(()=>new Chess());
  const [selected,setSelected]=useState<Selected>(null);

  const [mode,setMode]=useState<"pvp"|"bot">("bot");
  const botColor:"b"="b";

  const [capturedW,setCapturedW]=useState<string[]>([]);
  const [capturedB,setCapturedB]=useState<string[]>([]);

  const [timeMs,setTimeMs]=useState(TIME_PRESETS[2].ms);
  const [wMs,setWMs]=useState(timeMs);
  const [bMs,setBMs]=useState(timeMs);
  const [running,setRunning]=useState<"w"|"b"|null>(null);

  const [botThinking,setBotThinking]=useState(false);
  const lastTick=useRef<number|null>(null);

  const squares=useMemo(buildSquares,[]);
  const board=game.board();

  /* ============ END STATE ============ */

  const ruleEnd:GameEnd =
    game.isCheckmate()
      ? { kind:"checkmate", winner: game.turn()==="w"?"Black":"White" }
      : game.isDraw()
      ? { kind:"draw" }
      : { kind:"none" };

  const timeEnd:GameEnd =
    wMs<=0 ? { kind:"timeout", winner:"Black" }
    : bMs<=0 ? { kind:"timeout", winner:"White" }
    : { kind:"none" };

  const end = timeEnd.kind!=="none" ? timeEnd : ruleEnd;
  const showOverlay=end.kind!=="none";

  /* ============ TIMER ============ */

  useEffect(()=>{
    if(!running||showOverlay){lastTick.current=null;return;}
    const id=setInterval(()=>{
      const now=Date.now();
      const last=lastTick.current??now;
      const d=now-last;
      lastTick.current=now;
      running==="w"?setWMs(t=>t-d):setBMs(t=>t-d);
    },200);
    return()=>clearInterval(id);
  },[running,showOverlay]);

  /* ============ BOT MOVE ============ */

  useEffect(()=>{
    if(mode!=="bot"||showOverlay) return;
    if(game.turn()!==botColor||botThinking) return;

    setBotThinking(true);
    const fen=game.fen();
    const move=pickBotMove(new Chess(fen));

    const t=setTimeout(()=>{
      const next=new Chess(fen);
      const m=next.move(move);
      if(!m)return;
      if(m.captured)setCapturedB(c => [...c, m.captured!]);
      setGame(next);
      setRunning("w");
      setBotThinking(false);
    },5000);

    return()=>clearTimeout(t);
  },[game,mode,showOverlay]);

  /* ============ MOVES ============ */

  function onSquareClick(sq:Square){
    if(showOverlay) return;
    if(mode==="bot"&&game.turn()==="b") return;

    if(selected&&selected.legalTargets.includes(sq)){
      const next=new Chess(game.fen());
      const m=next.move({from:selected.from,to:sq,promotion:"q"});
      if(!m)return;
      if(m.captured)setCapturedW(c => [...c, m.captured!]);
      setGame(next);
      setRunning(next.turn());
      setSelected(null);
      return;
    }

    const p=game.get(sq);
    if(!p||p.color!==game.turn()) return;

    setSelected({
      from:sq,
      legalTargets:game.moves({square:sq,verbose:true}).map(m=>m.to as Square)
    });
  }

  function reset(newT=timeMs){
    setGame(new Chess());
    setSelected(null);
    setCapturedW([]);
    setCapturedB([]);
    setWMs(newT);
    setBMs(newT);
    setTimeMs(newT);
    setRunning(null);
    setBotThinking(false);
  }

  /* ============ RENDER ============ */

  return (
    <div className="board-wrap">
      <div className="board-area">

        <div className="top-bar">
          <div className="clock-row">
            <div className={`clock ${running==="b"?"active":""}`}>
              Black {formatMs(bMs)}
            </div>
            <div className={`clock ${running==="w"?"active":""}`}>
              White {formatMs(wMs)}
            </div>
          </div>

          <div className="controls-row">
            <button className="pill" onClick={()=>{setMode("pvp");reset();}}>2 Players</button>
            <button className="pill" onClick={()=>{setMode("bot");reset();}}>vs Bot</button>
            {TIME_PRESETS.map(p=>(
              <button key={p.label} className="time-btn" onClick={()=>reset(p.ms)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="board">
          {squares.map((sq,i)=>{
            const r=Math.floor(i/8),c=i%8;
            const piece=board[r][c];
            const light=(r+c)%2===0;
            return (
              <button
                key={sq}
                className={`square ${light?"light":"dark"} ${selected?.from===sq?"selected":""} ${selected?.legalTargets.includes(sq)?"target":""}`}
                onClick={()=>onSquareClick(sq)}
              >
                {piece&&<img src={getPieceImg(piece.type,piece.color)} className="piece"/>}
              </button>
            );
          })}
        </div>

        {game.isCheck()&&!showOverlay&&<div className="toast">CHECK</div>}

        {showOverlay&&(
          <div className="overlay">
            <div className="overlay-card">
              <div className="overlay-title">
                {end.kind==="checkmate"?"Checkmate":end.kind==="timeout"?"Time":"Draw"}
              </div>
              <div className="overlay-sub">
                {end.kind==="checkmate"||end.kind==="timeout"?`${end.winner} wins`:"Game drawn"}
              </div>
              <button className="overlay-btn" onClick={()=>reset()}>Play again</button>
            </div>
          </div>
        )}

      </div>

      <div className="side">
        <div>White captures (+{materialScore(capturedW)})</div>
        <div>Black captures (+{materialScore(capturedB)})</div>
      </div>
    </div>
  );
}
