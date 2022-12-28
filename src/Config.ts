import { FilledRect } from "@akashic/akashic-engine";
import { Button } from "./Button";
import { MainScene } from "./MainScene";
import { RPGAtsumaruWindow } from "./parameterObject";
declare const window: RPGAtsumaruWindow;

//設定画面クラス
export class Config extends g.FilledRect {
	static font: g.Font;
	public num: number = 0;
	public label: g.Label;
	public chkEnable: (ev: g.PointDownEvent) => boolean;
	public bgmEvent: (num: number) => void;
	public seEvent: (num: number) => void;
	public colorEvent: (color: string) => void;
	public volumes: number[] = [0.5, 0.8];
	public bg: FilledRect;

	constructor(scene: MainScene, x: number = 0, y: number = 0) {
		super({
			scene: scene,
			cssColor: "black",
			width: 500,
			height: 700,
			x: x,
			y: y,
			touchable: true,
		});

		this.chkEnable = (ev) => true;
		// const events = [this.bgmEvent, this.seEvent];

		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "monospace",
			size: 48,
		});

		const base = new g.FilledRect({
			scene: scene,
			x: 2,
			y: 2,
			width: this.width - 4,
			height: this.height - 4,
			cssColor: "white",
		});
		this.append(base);

		base.append(
			new g.Label({
				scene: scene,
				font: font,
				text: "設定",
				fontSize: 48,
				textColor: "black",
				widthAutoAdjust: false,
				textAlign: "center",
				width: 500,
			})
		);

		const line = new g.FilledRect({ scene: scene, x: 5, y: 60, width: 485, height: 2, cssColor: "#000000" });
		base.append(line);

		const strVol = ["ＢＧＭ", "効果音"];
		for (let i = 0; i < 2; i++) {
			base.append(
				new g.Label({
					scene: scene,
					font: font,
					text: strVol[i],
					fontSize: 48,
					textColor: "black",
					x: 20,
					y: 100 + 100 * i,
				})
			);

			const sprVol = new g.FrameSprite({
				scene: scene,
				src: scene.assets.volume as g.ImageAsset,
				width: 64,
				height: 64,
				x: 180,
				y: 100 + 100 * i,
				frames: [0, 1],
			});
			base.append(sprVol);

			const baseVol = new g.E({ scene: scene, x: 260, y: 100 + 100 * i, width: 220, height: 64, touchable: true });
			base.append(baseVol);

			const lineVol = new g.FilledRect({ scene: scene, x: 0, y: 26, width: 220, height: 12, cssColor: "gray" });
			baseVol.append(lineVol);

			const cursorVol = new g.FilledRect({
				scene: scene,
				x: 110 * this.volumes[i] - 7,
				y: 0,
				width: 30,
				height: 64,
				cssColor: "#000000",
			});
			baseVol.append(cursorVol);

			let flgMute = false;
			baseVol.onPointMove.add((e) => {
				let posX = e.point.x + e.startDelta.x;
				if (posX < 14) posX = 14;
				if (posX > 206) posX = 206;
				cursorVol.x = posX - 14;
				cursorVol.modified();
				flgMute = posX - 14 === 0;
			});

			baseVol.onPointUp.add((e) => {
				if (flgMute) {
					sprVol.frameNumber = 1;
				} else {
					sprVol.frameNumber = 0;
				}
				sprVol.modified();
				this.volumes[i] = cursorVol.x / 220;

				if (i === 0 && this.bgmEvent !== undefined) {
					this.bgmEvent(this.volumes[i]);
				}
			});
		}

		const colors = ["gray", "black", "white", "green", "navy"];
		let colorNum = 0;
		// 背景色
		base.append(
			new g.Label({
				scene: scene,
				font: font,
				text: "背景色",
				fontSize: 48,
				textColor: "black",
				x: 20,
				y: 300,
			})
		);

		base.append(new g.FilledRect({ scene: scene, x: 260, y: 300, width: 220, height: 80, cssColor: "#000000" }));

		const sprColor = new g.FilledRect({ scene: scene, x: 264, y: 304, width: 212, height: 72, cssColor: "gray", touchable: true });
		base.append(sprColor);

		sprColor.onPointDown.add((e) => {
			colorNum = (colorNum + 1) % colors.length;
			sprColor.cssColor = colors[colorNum];
			sprColor.modified();
			if (this.bg) {
				this.bg.cssColor = colors[colorNum];
				this.bg.modified();
			}
		});

		base.append(
			new g.Label({
				scene: scene,
				font: font,
				text: "ランキング",
				fontSize: 48,
				textColor: "black",
				x: 20,
				y: 385,
			})
		);

		// ランキング表示
		for (let i = 0; i < 1; i++) {
			const btnRank = new Button(scene, ["レベル" + (i + 1)], 4, 85 * i + 443, 260, 80);
			base.append(btnRank);
			btnRank.pushEvent = () => {
				if (typeof window !== "undefined" && window.RPGAtsumaru) {
					window.RPGAtsumaru.scoreboards.display(i + 1);
				}
			};
		}

		// リセット
		const btnReset = new Button(scene, ["リセット"], 276, 500, 210, 90);
		base.append(btnReset);
		btnReset.pushEvent = () => {
			this.hide();
			scene.reset();
		};

		// 閉じる
		const btnClose = new Button(scene, ["閉じる"], 276, 603, 210, 90);
		base.append(btnClose);
		btnClose.pushEvent = () => {
			this.hide();
		};
	}
}
