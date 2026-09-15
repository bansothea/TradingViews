"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { Candle } from "@/lib/markets/binance";

/**
 * A level drawn across the chart.
 *
 * Kept as plain data rather than pre-styled so the chart owns its own palette:
 * a stop is red here for the same reason a down candle is, and that decision
 * belongs in one place.
 */
export interface ChartLevel {
  price: number;
  label: string;
  kind: "entry" | "stop" | "target";
}

const LEVEL_STYLE: Record<ChartLevel["kind"], { color: string; style: LineStyle }> = {
  // Dashed for the zone edges and targets -- they are prices price may reach,
  // not prices it has traded. The stop is solid because it is the one line
  // that must not be ambiguous.
  entry: { color: "#4d86f7", style: LineStyle.Dashed },
  stop: { color: "#ea3943", style: LineStyle.Solid },
  target: { color: "#16c784", style: LineStyle.Dashed },
};

/**
 * Candlestick chart.
 *
 * lightweight-charts is TradingView's own library, so the interaction model is
 * the one being imitated rather than an approximation of it: dragging the
 * right-hand price axis rescales price, dragging the time axis rescales time,
 * and double-clicking either resets it. That behaviour is enabled explicitly
 * below rather than left to defaults, because it is the point of the screen.
 *
 * The chart instance is created once and then fed data imperatively -- it owns
 * its own canvas, so re-rendering it through React on every price tick would
 * throw away the user's zoom five times a second.
 */
export function PriceChart({
  candles,
  liveCandle,
  precision,
  interval,
  symbol,
  levels,
}: {
  candles: Candle[];
  /** The forming candle from the WebSocket, applied on top of the snapshot. */
  liveCandle?: Candle | null;
  /** Decimal places for the price axis; varies wildly between BTC and PEPE. */
  precision: number;
  interval: string;
  symbol: string;
  /** Entry, stop and target lines for a setup. Omitted on the plain chart. */
  levels?: ChartLevel[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  // Tracks which series is on screen, so we only reset the viewport when the
  // user actually switches symbol or interval -- not on every 5s refetch.
  const viewKeyRef = useRef<string>("");
  // Price lines are owned by the series, not by React, so they have to be
  // removed by hand before new ones are drawn or they accumulate on every
  // re-render.
  const linesRef = useRef<IPriceLine[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#151a23" },
        textColor: "#9aa4b4",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "#212936", style: LineStyle.Dotted },
        horzLines: { color: "#212936", style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#6d7787", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#2a323f" },
        horzLine: { color: "#6d7787", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#2a323f" },
      },
      rightPriceScale: {
        visible: true,
        borderColor: "#252d3a",
        // Room under the candles so the price tag never sits on the edge.
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "#252d3a",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
      },
      // Drag the price axis to zoom price, the time axis to zoom time.
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      autoSize: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16c784",
      downColor: "#ea3943",
      borderUpColor: "#16c784",
      borderDownColor: "#ea3943",
      wickUpColor: "#16c784",
      wickDownColor: "#ea3943",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      viewKeyRef.current = "";
    };
  }, []);

  // Price formatting is a series option, so it has to be reapplied whenever the
  // pair changes -- BTC wants 2 decimals, PEPE wants 8.
  useEffect(() => {
    seriesRef.current?.applyOptions({
      priceFormat: { type: "price", precision, minMove: 1 / 10 ** precision },
    });
  }, [precision]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || candles.length === 0) return;

    const viewKey = `${symbol}:${interval}`;
    const isNewView = viewKey !== viewKeyRef.current;

    const data = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    if (isNewView) {
      series.setData(data);
      chart.timeScale().fitContent();
      viewKeyRef.current = viewKey;
      return;
    }

    // Same series, refreshed data: preserve whatever the user has zoomed or
    // scrolled to, otherwise the viewport snaps back every five seconds.
    const range = chart.timeScale().getVisibleLogicalRange();
    series.setData(data);
    if (range) chart.timeScale().setVisibleLogicalRange(range);
  }, [candles, symbol, interval]);

  // Live ticks: update() touches only the last bar, so it costs nothing and
  // leaves the viewport alone. setData() here would fight the user's zoom
  // several times a second.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !liveCandle) return;

    // Guard against a tick from the previous pair arriving after a switch: the
    // series would gain a bar from the wrong market.
    if (viewKeyRef.current !== `${symbol}:${interval}`) return;

    series.update({
      time: liveCandle.time as Time,
      open: liveCandle.open,
      high: liveCandle.high,
      low: liveCandle.low,
      close: liveCandle.close,
    });
  }, [liveCandle, symbol, interval]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    for (const line of linesRef.current) series.removePriceLine(line);
    linesRef.current = [];

    if (!levels?.length) return;

    linesRef.current = levels.map((level) => {
      const style = LEVEL_STYLE[level.kind];
      return series.createPriceLine({
        price: level.price,
        color: style.color,
        lineWidth: 1,
        lineStyle: style.style,
        // The label on the price axis is what makes the line readable once the
        // user scrolls away from the setup.
        axisLabelVisible: true,
        title: level.label,
      });
    });
  }, [levels]);

  return <div ref={containerRef} className="h-full w-full" />;
}
