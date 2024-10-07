import { useIntlNumbers } from "@keybr/intl";
import { useFormatter } from "@keybr/lesson-ui";
import { type Distribution, Range, Vector } from "@keybr/math";
import { Canvas, type Rect, type ShapeList, Shapes } from "@keybr/widget";
import { type ReactNode } from "react";
import { useIntl } from "react-intl";
import { Chart, chartArea, type SizeProps } from "./Chart.tsx";
import { withStyles } from "./decoration.ts";
import { type Styles, useStyles } from "./styles.ts";
import { type Threshold } from "./types.ts";

export function SpeedHistogram({
  distribution,
  thresholds,
  width,
  height,
}: {
  readonly distribution: Distribution;
  readonly thresholds: readonly Threshold[];
} & SizeProps): ReactNode {
  const styles = useStyles();
  const paint = usePaint(styles, distribution, thresholds);
  return (
    <Chart width={width} height={height}>
      <Canvas paint={chartArea(styles, paint)} />
    </Chart>
  );
}

function usePaint(
  styles: Styles,
  dist: Distribution,
  thresholds: readonly Threshold[],
) {
  const { formatMessage } = useIntl();
  const { formatPercents } = useIntlNumbers();
  const { formatSpeed } = useFormatter();
  const g = withStyles(styles);

  const vIndex = new Vector();
  const vPmf = new Vector();
  const vCdf = new Vector();
  for (const { index, pmf, cdf } of dist) {
    vIndex.add(index);
    vPmf.add(pmf);
    vCdf.add(cdf);
  }
  const rIndex = Range.from(vIndex);
  const rPmf = Range.from(vPmf);
  const rCdf = Range.from(vCdf);

  return (box: Rect): ShapeList => {
    return [
      g.paintGrid(box, "vertical", { lines: 5 }),
      g.paintGrid(box, "horizontal", { lines: 5 }),
      paintPmfHistogram(),
      paintCdfHistogram(),
      thresholds.length > 0
        ? [thresholds.map(paintPmfLine), thresholds.map(paintCdfLine)]
        : g.paintNoData(box, formatMessage),
      g.paintAxis(box, "bottom"),
      g.paintAxis(box, "left"),
      g.paintTicks(box, rIndex, "bottom", {
        lines: 5,
        fmt: formatSpeed,
        style: styles.valueLabel,
      }),
      g.paintTicks(box, rCdf, "right", {
        lines: 5,
        fmt: formatPercents,
        style: styles.thresholdLabel,
      }),
    ];

    function paintPmfHistogram(): ShapeList {
      return Shapes.fill(
        styles.speed,
        [...rIndex.steps()].map((index) => {
          const w = Math.ceil(box.width / rIndex.span);
          const x = Math.round(rIndex.normalize(index, 1) * box.width);
          const y = Math.round(rPmf.normalize(vPmf.at(index)) * box.height);
          return Shapes.rect({
            x: box.x + x,
            y: box.y + box.height - y,
            width: w,
            height: y,
          });
        }),
      );
    }

    function paintCdfHistogram(): ShapeList {
      return Shapes.fill(
        styles.threshold,
        [...rIndex.steps()].map((index) => {
          const w = Math.ceil(box.width / rIndex.span);
          const x = Math.round(rIndex.normalize(index, 1) * box.width);
          const y = Math.round(rCdf.normalize(vCdf.at(index)) * box.height);
          return Shapes.rect({
            x: box.x + x,
            y: box.y + box.height - y - 1,
            width: w,
            height: 3,
          });
        }),
      );
    }

    function paintPmfLine({
      label,
      value,
    }: {
      label: string;
      value: number;
    }): ShapeList {
      if (value < rIndex.min || value > rIndex.max) {
        return [];
      }
      const x = Math.round(rIndex.normalize(value) * box.width);
      return [
        Shapes.fill(styles.value, [
          Shapes.rect({
            x: box.x + x,
            y: box.y - 10,
            width: 1,
            height: box.height + 20,
          }),
        ]),
        Shapes.fillText({
          x: box.x + x + 5,
          y: box.y + box.height - 5,
          value: formatSpeed(value),
          style: {
            ...styles.valueLabel,
            textAlign: "left",
            textBaseline: "bottom",
          },
        }),
      ];
    }

    function paintCdfLine({
      label,
      value,
    }: {
      label: string;
      value: number;
    }): ShapeList {
      if (value < rIndex.min || value > rIndex.max) {
        return [];
      }
      const y = Math.round(rCdf.normalize(dist.cdf(value)) * box.height);
      return [
        Shapes.fill(styles.threshold, [
          Shapes.rect({
            x: box.x - 10,
            y: box.y + box.height - y,
            width: box.width + 20,
            height: 1,
          }),
        ]),
        Shapes.fillText({
          x: box.x + box.width - 5,
          y: box.y + box.height - y - 5,
          value: formatPercents(dist.cdf(value)),
          style: {
            ...styles.thresholdLabel,
            textAlign: "right",
            textBaseline: "bottom",
          },
        }),
      ];
    }
  };
}
