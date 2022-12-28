import { MainScene } from "./MainScene";
import { GameMainParameterObject } from "./parameterObject";

export function main(param: GameMainParameterObject): void {
	const scene = new MainScene(param);
	g.game.pushScene(scene);
}
