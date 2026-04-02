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
