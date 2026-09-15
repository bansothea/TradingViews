import type {
  Candle,
  DealingRange,
  Direction,
  Displacement,
  Fvg,
  LiquidityPool,
  LiquiditySide,
  OrderBlock,
  RegimeRead,
  StructureState,
  Swing,
  Sweep,
} from "./types";
import type { EngineParams } from "./params";
import { DEFAULT_PARAMS } from "./params";
import { atrSeries } from "./indicators";
import { findSwings } from "./swings";
import { buildStructure, dealingRange } from "./structure";
import { findPools, findSweeps, markSwept } from "./liquidity";
import { findFvgs } from "./fvg";
import { findDisplacements } from "./displacement";
import { findBreakers, findOrderBlocks } from "./blocks";
import { classifyRegime } from "./regime";

/**
 * The analysis context.
 *
 * Every primitive is exposed as a lazily-memoised getter, so a feature is
 * computed at most once per scan no matter how many strategies ask for it.
 * That is the property that keeps performance flat as the strategy catalogue
 * grows: five strategies reading `ctx.swings("1h")` cost exactly one swing
 * scan, and adding a sixth that reuses existing features costs nothing
 * measurable.
 *
 * It is also the seam that keeps strategies honest. A strategy receives this
 * object and nothing else -- no fetch, no clock, no database -- so a strategy
 * physically cannot reach data the backtester would not have given it.
 */

export interface TimeframeInput {
  timeframe: string;
  /** Candle length in ms, used for gap detection. */
  intervalMs: number;
  /** Closed candles only. Pass them through closedCandles() first. */
  candles: Candle[];
}

export interface ContextOptions {
  symbol: string;
  /** Highest timeframe first: the bias timeframe, then setup, then trigger. */
  timeframes: TimeframeInput[];
  /** Injected rather than read from the clock, so backtests are honest. */
  now: number;
  params?: EngineParams;
  /**
   * Market beta. Alts are heavily correlated to BTC, so an alt long into a BTC
   * breakdown is usually wrong -- strategies consult this as a gate.
   */
  btc?: AnalysisContext | null;
}

export class AnalysisContext {
  readonly symbol: string;
  readonly now: number;
  readonly params: EngineParams;
  readonly btc: AnalysisContext | null;
  /** Timeframes in the order supplied: [bias, setup, trigger]. */
  readonly timeframes: string[];

  private readonly data = new Map<string, TimeframeInput>();
  private readonly memo = new Map<string, unknown>();

  constructor(options: ContextOptions) {
    this.symbol = options.symbol;
    this.now = options.now;
    this.params = options.params ?? DEFAULT_PARAMS;
    this.btc = options.btc ?? null;
    this.timeframes = options.timeframes.map((t) => t.timeframe);

    for (const input of options.timeframes) {
      this.data.set(input.timeframe, input);
    }
  }

  /** Memoises by key. The cast is safe: only this method ever writes the map. */
  private once<T>(key: string, compute: () => T): T {
    if (!this.memo.has(key)) this.memo.set(key, compute());
    return this.memo.get(key) as T;
  }

  private input(timeframe: string): TimeframeInput {
    const found = this.data.get(timeframe);
    // A strategy asking for a timeframe the scan did not fetch is a wiring
    // bug, not a market condition -- fail loudly rather than return an empty
    // series that silently reads as "no structure".
    if (!found) {
      throw new Error(
        `Timeframe ${timeframe} was not supplied to the context for ${this.symbol}`
      );
    }
    return found;
  }

  /** The bias timeframe -- the highest one supplied. */
  get bias(): string {
    return this.timeframes[0]!;
  }

  /** The trigger timeframe -- the lowest one supplied, and the one the user picked. */
  get trigger(): string {
    return this.timeframes[this.timeframes.length - 1]!;
  }

  candles(timeframe: string): Candle[] {
    return this.input(timeframe).candles;
  }

  /** Index of the last closed candle -- the bar every read is taken at. */
  lastIndex(timeframe: string): number {
    return this.candles(timeframe).length - 1;
  }

  price(timeframe: string = this.trigger): number {
    const candles = this.candles(timeframe);
    return candles[candles.length - 1]?.close ?? 0;
  }

  atr(timeframe: string): (number | null)[] {
    return this.once(`atr:${timeframe}`, () =>
      atrSeries(this.candles(timeframe), this.params.atrPeriod)
    );
  }

  /** Current ATR as a fraction of price: the engine's unit of distance. */
  atrPct(timeframe: string): number {
    const value = this.atr(timeframe)[this.lastIndex(timeframe)];
    const price = this.price(timeframe);
    return value != null && price > 0 ? value / price : 0;
  }

  swings(timeframe: string): Swing[] {
    return this.once(`swings:${timeframe}`, () =>
      findSwings(this.candles(timeframe), this.params.swingStrength)
    );
  }

  structure(timeframe: string): StructureState {
    return this.once(`structure:${timeframe}`, () =>
      buildStructure(this.candles(timeframe), this.swings(timeframe))
    );
  }

  range(timeframe: string): DealingRange | null {
    return this.once(`range:${timeframe}`, () =>
      dealingRange(
        this.swings(timeframe),
        this.price(timeframe),
        this.lastIndex(timeframe),
        this.params.equilibriumBand
      )
    );
  }

  pools(timeframe: string, side: LiquiditySide): LiquidityPool[] {
    return this.once(`pools:${timeframe}:${side}`, () => {
      const atIndex = this.lastIndex(timeframe);
      const found = findPools(
        this.swings(timeframe),
        side,
        atIndex,
        this.atr(timeframe)[atIndex] ?? null,
        {
          toleranceAtr: this.params.poolToleranceAtr,
          tolerancePct: this.params.poolTolerancePct,
          minTouches: this.params.poolMinTouches,
        }
      );
      return markSwept(found, this.candles(timeframe), this.params.sweepRequiresCloseBack);
    });
  }

  sweeps(timeframe: string): Sweep[] {
    return this.once(`sweeps:${timeframe}`, () =>
      findSweeps(
        this.candles(timeframe),
        [...this.pools(timeframe, "buyside"), ...this.pools(timeframe, "sellside")],
        this.atr(timeframe),
        this.params.sweepRequiresCloseBack
      )
    );
  }

  fvgs(timeframe: string): Fvg[] {
    return this.once(`fvgs:${timeframe}`, () =>
      findFvgs(this.candles(timeframe), this.atr(timeframe), this.params.fvgMinAtr)
    );
  }

  displacements(timeframe: string): Displacement[] {
    return this.once(`displacements:${timeframe}`, () =>
      findDisplacements(this.candles(timeframe), this.atr(timeframe), {
        atrMultiple: this.params.displacementAtrMultiple,
        bodyRatio: this.params.displacementBodyRatio,
      })
    );
  }

  orderBlocks(timeframe: string): OrderBlock[] {
    return this.once(`blocks:${timeframe}`, () =>
      findOrderBlocks(
        this.candles(timeframe),
        this.structure(timeframe).events,
        this.params.orderBlockLookback
      )
    );
  }

  breakers(timeframe: string): OrderBlock[] {
    return this.once(`breakers:${timeframe}`, () =>
      findBreakers(this.orderBlocks(timeframe), this.candles(timeframe))
    );
  }

  regime(timeframe: string): RegimeRead {
    return this.once(`regime:${timeframe}`, () =>
      classifyRegime(
        this.structure(timeframe),
        this.atr(timeframe),
        this.lastIndex(timeframe),
        {
          lookback: this.params.regimeLookback,
          volatileAtrMultiple: this.params.volatileAtrMultiple,
        }
      )
    );
  }

  /**
   * Directional bias from the highest timeframe: structure plus where price
   * sits in its dealing range. Both must agree, because a bullish structure at
   * a premium is a trend you have already missed.
   */
  htfBias(): { direction: Direction | null; aligned: boolean; reason: string } {
    const structure = this.structure(this.bias);
    const range = this.range(this.bias);

    if (!structure.bias) {
      return { direction: null, aligned: false, reason: "no structure on the bias timeframe" };
    }
    if (!range) {
      return { direction: structure.bias, aligned: false, reason: "no dealing range" };
    }

    const wantsDiscount = structure.bias === "bullish";
    const aligned = wantsDiscount ? range.zone !== "premium" : range.zone !== "discount";

    return {
      direction: structure.bias,
      aligned,
      reason: aligned
        ? `${this.bias} ${structure.bias} with price in ${range.zone}`
        : `${this.bias} ${structure.bias} but price is in ${range.zone}`,
    };
  }

  /** Diagnostics: how many distinct features this scan actually computed. */
  get computed(): number {
    return this.memo.size;
  }
}
