
import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts';
import { Candle } from '../types';
import { THEME } from '../constants';

interface TVChartProps {
  data: Candle[];
  lastCandle: Candle | null;
  currentPrice: number;
  entryPrice: number | null; 
  onPriceSelect: (price: number) => void;
  onUpdateOrder?: (type: 'SL' | 'TP', newPrice: number) => void;
  slPreviewPrice: number | null;
  tpPreviewPrice: number | null;
  activePosition: { entry: number; sl: number; tp: number } | null;
  potentialLossLabel?: string | null;
  potentialProfitLabel?: string | null;
}

const TVChart: React.FC<TVChartProps> = ({ 
  data, 
  lastCandle, 
  onPriceSelect,
  onUpdateOrder,
  slPreviewPrice,
  tpPreviewPrice,
  activePosition,
  currentPrice,
  potentialLossLabel,
  potentialProfitLabel
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const slLineRef = useRef<any>(null);
  const tpLineRef = useRef<any>(null);
  const pendingEntryLineRef = useRef<any>(null);

  const activeSlRef = useRef<any>(null);
  const activeTpRef = useRef<any>(null);
  const activeEntryRef = useRef<any>(null);

  const draggingRef = useRef<'SL' | 'TP' | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: THEME.bg },
        textColor: THEME.textMuted,
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#1e252e' },
        horzLines: { color: '#1e252e' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: THEME.border,
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: THEME.border,
        autoScale: true,
      }
    });

    const price = data.length > 0 ? data[data.length - 1].close : currentPrice;
    let precision = 2;
    let minMove = 0.01;
    if (price < 1) { precision = 6; minMove = 0.000001; }
    else if (price < 10) { precision = 4; minMove = 0.0001; }

    const candleSeries = chart.addCandlestickSeries({
      upColor: THEME.chartUp,
      downColor: THEME.chartDown,
      borderVisible: false,
      wickUpColor: THEME.chartUp,
      wickDownColor: THEME.chartDown,
      priceFormat: {
        type: 'price',
        precision: precision,
        minMove: minMove,
      },
    });

    candleSeries.setData(data);
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || !chartRef.current || !chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);

    const container = chartContainerRef.current;
    const onMouseDown = (e: MouseEvent | TouchEvent) => {
      const isTouch = 'touches' in e;
      const clientY = isTouch ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const y = clientY - container.getBoundingClientRect().top;
      
      if (!candleSeriesRef.current || !chartRef.current) return;
      const clickPrice = candleSeriesRef.current.coordinateToPrice(y);
      if (!clickPrice) return;

      if (activePosition) {
        const priceRange = clickPrice * 0.015;
        if (Math.abs(clickPrice - activePosition.sl) < priceRange) {
          draggingRef.current = 'SL';
          return;
        }
        if (Math.abs(clickPrice - activePosition.tp) < priceRange) {
          draggingRef.current = 'TP';
          return;
        }
      } else {
        onPriceSelect(clickPrice);
      }
    };

    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current || !candleSeriesRef.current) return;
      const isTouch = 'touches' in e;
      const clientY = isTouch ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const y = clientY - container.getBoundingClientRect().top;
      const newPrice = candleSeriesRef.current.coordinateToPrice(y);
      if (newPrice) {
        if (draggingRef.current === 'SL' && activeSlRef.current) activeSlRef.current.applyOptions({ price: newPrice, title: 'SL (Drag)' });
        if (draggingRef.current === 'TP' && activeTpRef.current) activeTpRef.current.applyOptions({ price: newPrice, title: 'TP (Drag)' });
      }
    };

    const onMouseUp = (e: MouseEvent | TouchEvent) => {
      if (draggingRef.current && candleSeriesRef.current && onUpdateOrder) {
        const clientY = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
        const y = clientY - container.getBoundingClientRect().top;
        const finalPrice = candleSeriesRef.current.coordinateToPrice(y);
        if (finalPrice) onUpdateOrder(draggingRef.current, finalPrice);
      }
      draggingRef.current = null;
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('touchstart', onMouseDown, { passive: true });
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchend', onMouseUp);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('touchstart', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onMouseUp);
      chart.remove();
    };
  }, [activePosition, data.length]);

  useEffect(() => {
    if (candleSeriesRef.current && lastCandle) candleSeriesRef.current.update(lastCandle);
  }, [lastCandle]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    [slLineRef, tpLineRef, pendingEntryLineRef].forEach(ref => {
      if (ref.current) { candleSeriesRef.current?.removePriceLine(ref.current); ref.current = null; }
    });

    if (!activePosition && slPreviewPrice) {
      pendingEntryLineRef.current = candleSeriesRef.current.createPriceLine({
        price: currentPrice, color: THEME.textMuted, lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'ENTRY'
      });
      slLineRef.current = candleSeriesRef.current.createPriceLine({
        price: slPreviewPrice, color: THEME.danger, lineWidth: 2, lineStyle: LineStyle.Solid, title: `SL ${potentialLossLabel || ''}`
      });
      if (tpPreviewPrice) {
        tpLineRef.current = candleSeriesRef.current.createPriceLine({
          price: tpPreviewPrice, color: THEME.success, lineWidth: 2, lineStyle: LineStyle.Solid, title: `TP ${potentialProfitLabel || ''}`
        });
      }
    }
  }, [slPreviewPrice, tpPreviewPrice, currentPrice, activePosition, potentialLossLabel, potentialProfitLabel]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    [activeSlRef, activeTpRef, activeEntryRef].forEach(ref => {
      if (ref.current) { candleSeriesRef.current?.removePriceLine(ref.current); ref.current = null; }
    });

    if (activePosition) {
      activeEntryRef.current = candleSeriesRef.current.createPriceLine({
        price: activePosition.entry, color: THEME.warning, lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'ENTRY'
      });
      activeSlRef.current = candleSeriesRef.current.createPriceLine({
        price: activePosition.sl, color: THEME.danger, lineWidth: 2, lineStyle: LineStyle.Dotted, title: 'SL'
      });
      activeTpRef.current = candleSeriesRef.current.createPriceLine({
        price: activePosition.tp, color: THEME.success, lineWidth: 2, lineStyle: LineStyle.Dotted, title: 'TP'
      });
    }
  }, [activePosition]);

  return <div ref={chartContainerRef} className="w-full h-full relative" />;
};

export default TVChart;
