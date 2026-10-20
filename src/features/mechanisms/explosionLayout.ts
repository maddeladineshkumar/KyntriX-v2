/** Non-overlapping inventory cells measured from piece bounding boxes */
export interface InventoryItem {
  id: string;
  width: number;
  height: number;
  group: string;
}

export interface InventoryCell {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PackedInventory {
  cells: Map<string, InventoryCell>;
  width: number;
  height: number;
}

export function packInventory(
  items: InventoryItem[],
  aspect: number,
  gap: number
): PackedInventory {
  const cells = new Map<string, InventoryCell>();
  if (!items.length) {
    return { cells, width: 1, height: 1 };
  }

  const safeGap = Number.isFinite(gap) && gap >= 0 ? gap : 0.05;
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1.0;
  const clampedAspect = Math.max(0.25, Math.min(4, safeAspect));

  const cards = items.map((item) => ({
    ...item,
    width: Math.max(0.085, Number.isFinite(item.width) ? item.width : 0.1) + safeGap,
    height: Math.max(0.085, Number.isFinite(item.height) ? item.height : 0.1) + safeGap,
  }));

  const area = cards.reduce((sum, card) => sum + card.width * card.height, 0);

  // Tall pieces lead each shelf; stable secondary sort maintains repeatability
  cards.sort(
    (a, b) =>
      b.height - a.height ||
      a.group.localeCompare(b.group) ||
      a.id.localeCompare(b.id)
  );

  const widthTarget = Math.max(
    ...cards.map((c) => c.width),
    Math.sqrt(area * clampedAspect) * 1.07
  );

  let rowY = 0;
  let rowHeight = 0;
  let cursor = 0;
  let width = 0;

  for (const card of cards) {
    if (cursor && cursor + card.width > widthTarget) {
      rowY += rowHeight;
      cursor = 0;
      rowHeight = 0;
    }
    cells.set(card.id, {
      x: cursor + card.width / 2,
      y: -(rowY + card.height / 2),
      width: card.width,
      height: card.height,
    });
    cursor += card.width;
    rowHeight = Math.max(rowHeight, card.height);
    width = Math.max(width, cursor);
  }

  const height = rowY + rowHeight;
  for (const cell of cells.values()) {
    cell.x -= width / 2;
    cell.y += height / 2;
  }

  return { cells, width, height };
}
