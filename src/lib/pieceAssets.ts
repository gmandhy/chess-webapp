import bishopB from "../assets/pieces/bishop-b.svg";
import bishopW from "../assets/pieces/bishop-w.svg";
import kingB from "../assets/pieces/king-b.svg";
import kingW from "../assets/pieces/king-w.svg";
import knightB from "../assets/pieces/knight-b.svg";
import knightW from "../assets/pieces/knight-w.svg";
import pawnB from "../assets/pieces/pawn-b.svg";
import pawnW from "../assets/pieces/pawn-w.svg";
import queenB from "../assets/pieces/queen-b.svg";
import queenW from "../assets/pieces/queen-w.svg";
import rookB from "../assets/pieces/rook-b.svg";
import rookW from "../assets/pieces/rook-w.svg";

export function getPieceImg(type: string, color: string): string {
  const key = `${color}${type}`; // e.g., "wp", "bk"
  switch (key) {
    case "wp": return pawnW;
    case "bp": return pawnB;
    case "wn": return knightW;
    case "bn": return knightB;
    case "wb": return bishopW;
    case "bb": return bishopB;
    case "wr": return rookW;
    case "br": return rookB;
    case "wq": return queenW;
    case "bq": return queenB;
    case "wk": return kingW;
    case "bk": return kingB;
    default: return "";
  }
}