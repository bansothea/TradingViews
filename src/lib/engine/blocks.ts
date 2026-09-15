import type {
  Candle,
  Direction,
  Mitigation,
  OrderBlock,
  StructureEvent,
} from "./types";

/**
 * Order blocks and breakers.
 *
 * An order block is the last opposing candle before the move that broke
 * structure -- the bar where the side that was about to lose made its final
 * push. The premise is that unfilled orders remain there, so price returning
 * to it finds a reaction.
 *
 * This is the one ICT primitive with genuinely ambiguous definitions in the
 * wild: last opposing *close* or last opposing *candle*, full range or body
 * only, nearest break or the one that caused displacement. Each reading is
 * defensible and they disagree constantly. The choice made here -- last
 * opposing-close candle, full candle range, must precede a break that closed
 * beyond it -- is frozen. Changing it later is a version bump, because every
 * stored setup was computed under whichever reading was live at the time.
 */

/**
 * Finds the block behind each structure break.
 *
 * Not every break has one: if the lookback contains no opposing candle, or
 * price never actually cleared it, there is no block rather than a
 * best-effort guess.
 */
export function findOrderBlocks(
  candles: Candle[],
  events: StructureEvent[],
  lookback: number
): OrderBlock[] {
  const blocks: OrderBlock[] = [];

  for (const event of events) {
    const bullish = event.direction === "bullish";
    const origin = findOrigin(candles, event.index, lookback, bullish);
    if (origin === null) continue;

    const candle = candles[origin]!;
    const breakCandle = candles[event.index]!;

    // Price must have genuinely left the block on the way to breaking
    // structure. Without this, a sideways drift through a level produces a
    // "block" that price never displaced away from.
    if (bullish && breakCandle.close <= candle.high) continue;
    if (!bullish && breakCandle.close >= candle.low) continue;

    blocks.push({
      index: origin,
      time: candle.openTime,
      // A bullish break is caused by a down candle: that bar is demand.
      direction: bullish ? "bullish" : "bearish",
      top: candle.high,
      bottom: candle.low,
      eventIndex: event.index,
      role: "orderblock",
      mitigation: "untouched",
      mitigatedAtIndex: null,
      broken: false,
      brokenAtIndex: null,
    });
  }

  return blocks.map((block) => resolve(block, candles, block.eventIndex + 1));
}

/** The last candle closing against the direction of the break. */
function findOrigin(
  candles: Candle[],
  eventIndex: number,
  lookback: number,
  bullish: boolean
): number | null {
  const floor = Math.max(0, eventIndex - lookback);

  for (let i = eventIndex - 1; i >= floor; i--) {
    const candle = candles[i]!;
    const opposing = bullish ? candle.close < candle.open : candle.close > candle.open;
    if (opposing) return i;
  }

  return null;
}

/**
 * Walks price forward from the block to work out what became of it.
 *
 * Order matters: a block is only "broken" once price closes through it
 * against its direction, and that check has to come after mitigation, because
 * every break passes through the zone on the way out.
 */
function resolve(block: OrderBlock, candles: Candle[], from: number): OrderBlock {
  let mitigation: Mitigation = "untouched";
  let mitigatedAtIndex: number | null = null;

  for (let i = from; i < candles.length; i++) {
    const candle = candles[i]!;

    if (block.direction === "bullish") {
      if (mitigation === "untouched" && candle.low <= block.top) {
        mitigation = "partial";
        mitigatedAtIndex = i;
      }
      if (candle.low <= block.bottom) mitigation = "filled";
      // Closing below the zone is failure, not mitigation: the demand did not
      // hold, and the block is now a candidate breaker.
      if (candle.close < block.bottom) {
        return { ...block, mitigation, mitigatedAtIndex, broken: true, brokenAtIndex: i };
      }
    } else {
      if (mitigation === "untouched" && candle.high >= block.bottom) {
        mitigation = "partial";
        mitigatedAtIndex = i;
      }
      if (candle.high >= block.top) mitigation = "filled";
      if (candle.close > block.top) {
        return { ...block, mitigation, mitigatedAtIndex, broken: true, brokenAtIndex: i };
      }
    }
  }

  return { ...block, mitigation, mitigatedAtIndex };
}

/**
 * Breakers: order blocks that failed.
 *
 * Demand that price closed through stops being demand and tends to act as
 * supply when retested from below -- the traders who bought there are now
 * offside and sell the retest to get out flat. So a broken block is re-cast
 * with its direction inverted.
 */
export function findBreakers(blocks: OrderBlock[], candles: Candle[]): OrderBlock[] {
  return blocks
    .filter((block) => block.broken && block.brokenAtIndex !== null)
    .map((block) => {
      const flipped: OrderBlock = {
        ...block,
        role: "breaker",
        direction: (block.direction === "bullish" ? "bearish" : "bullish") as Direction,
        // The flip mints a live zone in the opposite direction. Carrying
        // `broken: true` across would leave every breaker permanently filtered
        // out of usableBlocks(), which is to say unreachable.
        broken: false,
        mitigation: "untouched",
        mitigatedAtIndex: null,
      };

      // Re-read price from the moment it flipped, not from the original break.
      // Its history as demand says nothing about whether it has since been
      // retested as supply.
      return resolve(flipped, candles, block.brokenAtIndex! + 1);
    });
}

/** Unmitigated blocks in a direction, nearest to price first. */
export function usableBlocks(
  blocks: OrderBlock[],
  direction: Direction,
  price: number,
  atIndex: number
): OrderBlock[] {
  return blocks
    .filter(
      (block) =>
        block.direction === direction &&
        !block.broken &&
        block.mitigation !== "filled" &&
        block.eventIndex <= atIndex
    )
    .sort(
      (a, b) =>
        Math.abs(price - (a.top + a.bottom) / 2) -
        Math.abs(price - (b.top + b.bottom) / 2)
    );
}
