/**
 * マッププレビュー — drawMap() の出力をブライユ文字列として表示する。
 *
 * result / width / height が変わるたびに useEffect で再描画する。
 * --no-map フラグが指定された場合、App.tsx 側でこのコンポーネント自体がマウントされない。
 */

import { Text } from "ink";
import { useEffect, useState, type FC } from "react";
import { drawMap } from "../lib/drawMap.js";
import type { ParseResult } from "../lib/types.js";

interface Props {
  result: ParseResult;
  width: number;
  height: number;
}

const MapPreview: FC<Props> = ({ result, width, height }) => {
  const [frame, setFrame] = useState("");

  useEffect(() => {
    const output = drawMap(result, width, height);
    setFrame(output);
  }, [result, width, height]);

  return (
    <>
      <Text bold underline>
        MAP PREVIEW
      </Text>
      <Text>{frame}</Text>
    </>
  );
};

export default MapPreview;
