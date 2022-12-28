import tl = require("@akashic-extension/akashic-timeline");
import { MainScene } from "./MainScene";

//ゲームクラス
export class MainGame extends g.E {
	constructor() {
		const scene = g.game.scene() as MainScene;
		super({ scene: scene, width: g.game.width, height: g.game.height, touchable: true });
		const timeline = new tl.Timeline(scene);

		//戻るボタンの表示
		const btnUndo = new g.FrameSprite({
			scene: scene,
			src: scene.asset.getImageById("undo"),
			x: 50,
			y: 500,
			width: 200,
			height: 70,
			frames: [0, 1],
			frameNumber: 0,
			parent: this,
			touchable: true,
		});
		btnUndo.onPointDown.add(() => {
			if (!scene.isStart) return;
			btnUndo.frameNumber = 1;
			btnUndo.modified();
		});
		btnUndo.onPointUp.add(() => {
			btnUndo.frameNumber = 0;
			btnUndo.modified();
			if (!scene.isStart) return;
			if (undo()) {
				//スコアを減らして戻す
				scene.addScore(-100);
				scene.playSound("se_move");
			}
		});

		//進むボタン
		const btnRedo = new g.FrameSprite({
			scene: scene,
			src: scene.asset.getImageById("redo"),
			x: 50,
			y: 600,
			width: 200,
			height: 70,
			frames: [0, 1],
			frameNumber: 0,
			parent: this,
			touchable: true,
		});
		btnRedo.onPointDown.add(() => {
			if (!scene.isStart) return;
			btnRedo.frameNumber = 1;
			btnRedo.modified();
		});
		btnRedo.onPointUp.add(() => {
			btnRedo.frameNumber = 0;
			btnRedo.modified();
			if (!scene.isStart) return;
			redo();
			scene.playSound("se_move");
		});

		//詰み表示
		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "monospace",
			size: 50,
		});

		//クリアエフェクト表示用スプライト
		const effect = new g.FrameSprite({
			scene: scene,
			src: scene.asset.getImageById("effect"),
			frames: [0, 1, 2],
			width: 120,
			height: 120,
			interval: 200,
			// anchorX:0.5,
			// anchorY:0.5,
			scaleX: 2,
			scaleY: 2,
		});

		//残りのペグ数、クリア、詰みの表示用
		const label = new g.Label({
			scene: scene,
			font: font,
			fontSize: 50,
			x: 1050,
			y: 600,
			text: "",
			textColor: "white",
			parent: this,
		});

		//円形のボードを表示
		const board = new g.Sprite({
			scene: scene,
			src: scene.asset.getImageById("board"),
			parent: this,
		});
		board.x = (g.game.width - board.width) / 2;
		board.y = (g.game.height - board.height) / 2;
		board.modified();

		//マップを表示
		const base = new g.E({
			scene: scene,
			x: (g.game.width - 90 * 7) / 2,
			y: (g.game.height - 90 * 7) / 2,
			parent: this,
		});

		const map = [
			[-1, -1, 1, 1, 1, -1, -1],
			[-1, -1, 1, 1, 1, -1, -1],
			[1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 0, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1],
			[-1, -1, 1, 1, 1, -1, -1],
			[-1, -1, 1, 1, 1, -1, -1],
		];

		//４方向判定用
		const dx = [0, 1, 0, -1];
		const dy = [-1, 0, 1, 0];

		//取ったペグのリスト
		const pegList: Peg[] = [];

		//移動のリスト
		const moveList: MoveState[] = [];
		const redoList: MoveState[] = [];

		//移動対象のペグの位置表示用
		const playerCursor = new g.FilledRect({
			scene: scene,
			width: 90,
			height: 90,
			cssColor: "yellow",
			opacity: 0.5,
		});

		const pegImage = scene.asset.getImageById("peg");
		const redPegImage = scene.asset.getImageById("peg_red");

		//移動先のペグの位置表示用(４か所)
		const dstCursor: Cursor[] = [];
		for (let i = 0; i < 4; i++) {
			const cursor = new Cursor({
				scene: scene,
				width: 90,
				height: 90,
				cssColor: "yellow",
				opacity: 0.5,
				touchable: true,
			});
			dstCursor.push(cursor);

			cursor.onPointDown.add(() => {
				if (!scene.isStart) return;
				move(cursor.m);

				btnUndo.show();
				redoList.length = 0;
				btnRedo.hide();

				scene.playSound("se_move");

				if (cntPeg === 1) {
					label.text = "クリア!";
					label.invalidate();
					label.show();
					btnUndo.hide();

					const map = moveList[moveList.length - 1].dm;
					base.append(effect);
					effect.moveTo(map.x - 75, map.y - 75);
					effect.modified();
					effect.start();

					scene.addScore(100 + Math.floor(scene.time));

					scene.playSound("se_clear");
				} else if (!checkMate()) {
					//詰み
					label.text = "詰み";
					label.invalidate();
					label.show();
					scene.playSound("se_miss");
				}
			});
		}

		const maps: Map[][] = [];
		let cntPeg = 0; //置いたペグのカウント用
		for (let y = 0; y < 7; y++) {
			maps[y] = [];
			for (let x = 0; x < 7; x++) {
				//盤面の作成
				const size = 90;
				const m = new Map({
					scene: scene,
					x: x * size,
					y: y * size,
					src: scene.asset.getImageById("shadow"),
					touchable: true,
					parent: base,
				});
				m.p.x = x;
				m.p.y = y;
				maps[y][x] = m;

				if (map[y][x] === -1) {
					m.hide();
				}

				m.onPointDown.add((ev) => {
					if (!scene.isStart) return;
					if (m.peg) {
						m.append(playerCursor);

						//カーソルをいったん全部消す
						for (let i = 0; i < 4; i++) {
							if (dstCursor[i].parent) {
								dstCursor[i].remove();
							}
						}

						//４方向にカーソルを表示させる
						const arr = getMovePoints(x, y);
						for (let i of arr) {
							const xx = x + dx[i] * 2;
							const yy = y + dy[i] * 2;
							maps[yy][xx].append(dstCursor[i]);
							const sm = m;
							const gm = maps[y + dy[i]][x + dx[i]];
							const dm = maps[yy][xx];
							dstCursor[i].m = { sm: sm, gm: gm, dm: dm };
						}
					}
				});
			}
		}

		//移動可能箇所の配列を返す
		const getMovePoints: (x: number, y: number) => number[] = (x, y) => {
			const arr: number[] = [];
			for (let i = 0; i < 4; i++) {
				const xx = x + dx[i] * 2;
				const yy = y + dy[i] * 2;
				if (
					xx >= 0 &&
					xx < 7 &&
					yy >= 0 &&
					yy < 7 &&
					maps[y + dy[i]][x + dx[i]].peg &&
					maps[yy][xx].visible() &&
					!maps[yy][xx].peg
				) {
					arr.push(i);
				}
			}
			return arr;
		};

		// //戻し可能箇所の配列を返す
		// const getUndoPoints: (x: number, y: number) => number[] = (x, y) => {
		// 	const arr: number[] = [];
		// 	for (let i = 0; i < 4; i++) {
		// 		const x1 = x + dx[i];
		// 		const y1 = y + dy[i];
		// 		const x2 = x + dx[i] * 2;
		// 		const y2 = y + dy[i] * 2;
		// 		if (
		// 			x2 >= 0 &&
		// 			x2 < 7 &&
		// 			y2 >= 0 &&
		// 			y2 < 7 &&
		// 			maps[y1][x1].visible() &&
		// 			!maps[y1][x1].peg &&
		// 			maps[y2][x2].visible() &&
		// 			!maps[y2][x2].peg
		// 		) {
		// 			arr.push(i);
		// 		}
		// 	}
		// 	return arr;
		// };

		//詰みチェック
		const checkMate: () => boolean = () => {
			for (let y = 0; y < 7; y++) {
				for (let x = 0; x < 7; x++) {
					const map = maps[y][x];
					if (map.peg && getMovePoints(x, y).length) {
						return true;
					}
				}
			}
			return false;
		};

		//移動
		const move: (m: MoveState) => void = (m) => {
			//ペグを移動
			let peg = m.sm.peg;
			m.sm.peg = null;
			base.append(peg);
			const dmap = m.dm;
			dmap.peg = peg;
			timeline.create(peg).moveTo(dmap.x, dmap.y, 200);
			//ペグをジャンプさせるアニメーション
			timeline.create(peg.peg).moveTo(0, -100, 100, tl.Easing.easeInOutCubic).moveTo(0, 0, 100, tl.Easing.easeInCubic);

			//ペグを取る
			peg = m.gm.peg;
			m.gm.peg = null;
			peg.peg.src = redPegImage;
			peg.peg.invalidate();
			scene.setTimeout(() => {
				peg.remove();
			}, 400);
			scene.addScore(100);

			//カーソル表示を消す
			if (playerCursor.parent) playerCursor.remove();
			for (let i = 0; i < 4; i++) {
				if (dstCursor[i].parent) dstCursor[i].remove();
			}

			//リストに追加
			pegList.push(peg);
			console.log(m);
			moveList.push(m);

			cntPeg--;
			label.text = "残り " + cntPeg;
			label.invalidate();
		};

		//アンドゥ
		const undo: () => boolean = () => {
			if (!moveList.length) return false;
			const m = moveList.pop();
			console.log(moveList.length);
			//移動先のペグを移動元に戻す
			m.sm.peg = m.dm.peg;
			m.dm.peg = null;
			m.sm.peg.moveTo(m.sm.x, m.sm.y);
			m.sm.peg.modified();

			//取ったペグを戻す
			const peg = pegList.pop();
			base.append(peg);
			m.gm.peg = peg;
			peg.moveTo(m.gm.x, m.gm.y);
			peg.peg.src = pegImage;
			peg.peg.invalidate();
			peg.peg.modified();

			redoList.push(m);

			if (!moveList.length) btnUndo.hide();
			btnRedo.show();
			cntPeg++;
			label.text = "残り " + cntPeg;
			label.invalidate();

			return true;
		};

		//リドゥ
		const redo: () => void = () => {
			if (!redoList.length) return;
			const m = redoList.pop();
			move(m);
			if (!redoList.length) btnRedo.hide();
			btnUndo.show();
		};

		//ペグ生成
		for (let i = 0; i < 32; i++) {
			const peg = new Peg(0, 0);
			pegList.push(peg);
		}

		//盤面をテキストアセットから生成
		const stageData: StageData[] = scene.asset.getJSONContentById("stage");
		cntPeg = 1;

		const p = pegList.pop();
		const data = stageData[Math.floor(g.game.random.generate() * 20)];
		const m = maps[data.endPoint.y][data.endPoint.x];
		m.peg = p;
		base.append(p);
		p.moveTo(m.x, m.y);
		p.modified();

		data.moves.forEach((d) => {
			const sm = maps[d.s.y][d.s.x];
			const gm = maps[d.g.y][d.g.x];
			const dm = maps[d.d.y][d.d.x];
			moveList.push({ sm: sm, gm: gm, dm: dm });
			undo();
		});

		moveList.length = 0;
		redoList.length = 0;

		btnUndo.hide();
		btnRedo.hide();

		// let stageDatas: StageData[] = [];
		// while (true) {
		// 	//盤面自動生成
		// 	for (let cnt = 0; cnt < 500; cnt++) {
		// 		let stageData: StageData;
		// 		redoList.length = 0;

		// 		for (let y = 0; y < 7; y++) {
		// 			for (let x = 0; x < 7; x++) {
		// 				if (!maps[y][x].peg) continue;
		// 				const peg = maps[y][x].peg;
		// 				maps[y][x].peg = null;
		// 				pegList.push(peg);
		// 			}
		// 		}

		// 		//とりあえず盤面に１つペグを置く
		// 		const p = pegList.pop();
		// 		let m: Map;
		// 		while (true) {
		// 			const px = Math.floor(g.game.random.generate() * 7);
		// 			const py = Math.floor(g.game.random.generate() * 7);
		// 			m = maps[py][px];
		// 			if (m.visible()) {
		// 				stageData = { endPoint: { x: px, y: py }, moves: [] };
		// 				break;
		// 			}
		// 		}
		// 		m.peg = p;
		// 		base.append(p);
		// 		p.moveTo(m.x, m.y);
		// 		p.modified();

		// 		while (true) {
		// 			const listUndo: MoveState[] = [];
		// 			for (let y = 0; y < 7; y++) {
		// 				for (let x = 0; x < 7; x++) {
		// 					const m = maps[y][x];
		// 					if (m.peg) {
		// 						const list = getUndoPoints(x, y);
		// 						if (list.length) {
		// 							const n = Math.floor(g.game.random.generate() * list.length);
		// 							const i = list[n];
		// 							const x1 = x + dx[i];
		// 							const y1 = y + dy[i];
		// 							const x2 = x + dx[i] * 2;
		// 							const y2 = y + dy[i] * 2;

		// 							listUndo.push({ sm: maps[y2][x2], gm: maps[y1][x1], dm: maps[y][x] });
		// 						}
		// 					}
		// 				}
		// 			}
		// 			if (!listUndo.length) {
		// 				break;
		// 			} else {
		// 				moveList.push(listUndo[Math.floor(g.game.random.generate() * listUndo.length)]);
		// 				undo();
		// 			}
		// 		}
		// 		if (pegList.length === 2) {
		// 			redoList.forEach((m) => {
		// 				stageData.moves.push({ s: m.sm.p, g: m.gm.p, d: m.dm.p });
		// 			});

		// 			stageDatas.push(stageData);

		// 			break;
		// 		}
		// 	}
		// 	if (stageDatas.length > 20) break;
		// 	console.log(stageDatas.length);
		// }
		// const str = JSON.stringify(stageDatas);
		// console.log(str);
		// navigator.clipboard.writeText(str);//クリップボードにコピー
	}
}

//マップチップ
class Map extends g.Sprite {
	public p: { x: number; y: number } = { x: 0, y: 0 };
	public peg: Peg;
}

//移動先のカーソル
class Cursor extends g.FilledRect {
	public m: MoveState;

	constructor(param: g.FilledRectParameterObject) {
		super(param);
		this.m = { sm: null, gm: null, dm: null };
	}
}

//ペグ
class Peg extends g.Sprite {
	public peg: g.Sprite;

	constructor(x: number, y: number) {
		const scene = g.game.scene();
		super({
			scene: scene,
			x: x,
			y: y,
			src: scene.asset.getImageById("peg_shadow"),
		});

		this.peg = new g.Sprite({
			scene: scene,
			src: scene.asset.getImageById("peg"),
			parent: this,
		});
	}
}

type MoveState = { sm: Map; gm: Map; dm: Map };

//盤面とクリア手順の表示用
type StageData = {
	endPoint: { x: number; y: number };
	moves: { s: { x: number; y: number }; g: { x: number; y: number }; d: { x: number; y: number } }[];
};
