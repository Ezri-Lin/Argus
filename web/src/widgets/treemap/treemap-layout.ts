import {
  hierarchy,
  treemapSquarify,
  treemap as d3Treemap,
  type HierarchyRectangularNode,
} from "d3";
import type { TreemapItem } from "@/dashboard/mock-data";

export type PositionedCell = {
  x: number;
  y: number;
  w: number;
  h: number;
  item: TreemapItem;
};

const padding = 3;

export function layoutTreemap(
  items: TreemapItem[],
  width: number,
  height: number,
): PositionedCell[] {
  if (!items.length || width <= 0 || height <= 0) return [];

  const visible = items
    .filter((i) => !i.refuted)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (b.item.value ?? 0) - (a.item.value ?? 0) || a.index - b.index)
    .map(({ item }) => item);
  if (!visible.length) return [];

  const root = hierarchy<TreemapItem>({ name: "root", children: visible } as unknown as TreemapItem)
    .sum((d) => Math.max((d as TreemapItem).value ?? 0, 1));

  const layout = d3Treemap<TreemapItem>()
    .size([width, height])
    .tile(treemapSquarify)
    .paddingOuter(padding)
    .paddingInner(padding)
    .paddingTop(0);

  const laid = layout(root) as HierarchyRectangularNode<TreemapItem>;

  return laid.leaves().map((leaf) => ({
    x: leaf.x0,
    y: leaf.y0,
    w: leaf.x1 - leaf.x0,
    h: leaf.y1 - leaf.y0,
    item: leaf.data,
  }));
}
