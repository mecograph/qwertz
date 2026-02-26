import { registerTheme } from 'echarts/core';

registerTheme('terminal', {
  color: ['#33ff00', '#ffb000', '#00ffff', '#ff3333', '#1f521f', '#88ff44', '#ff8800', '#44ffcc', '#ff6666', '#33cc00'],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    color: '#33ff00',
  },
  title: {
    textStyle: { color: '#33ff00', fontFamily: '"JetBrains Mono", monospace' },
    subtextStyle: { color: '#555555' },
  },
  legend: {
    textStyle: { color: '#33ff00' },
    pageTextStyle: { color: '#555555' },
    pageIconColor: '#33ff00',
    pageIconInactiveColor: '#1f521f',
  },
  tooltip: {
    backgroundColor: '#111111',
    borderColor: '#1f521f',
    borderWidth: 1,
    textStyle: {
      color: '#33ff00',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 12,
    },
    extraCssText: 'border-radius: 0; box-shadow: 0 0 8px rgba(51,255,0,0.3);',
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#1f521f' } },
    axisTick: { lineStyle: { color: '#1f521f' } },
    axisLabel: { color: '#33ff00' },
    splitLine: { lineStyle: { color: '#1f521f', type: 'dashed' } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: '#1f521f' } },
    axisTick: { lineStyle: { color: '#1f521f' } },
    axisLabel: { color: '#33ff00' },
    splitLine: { lineStyle: { color: '#1f521f', type: 'dashed' } },
  },
  line: {
    symbol: 'circle',
    symbolSize: 6,
  },
  bar: {
    itemStyle: { borderWidth: 0 },
  },
  pie: {
    label: { color: '#33ff00' },
    itemStyle: { borderColor: '#0a0a0a', borderWidth: 1 },
  },
  sankey: {
    label: {
      color: '#33ff00',
      fontFamily: '"JetBrains Mono", monospace',
      fontWeight: 500,
    },
    itemStyle: { borderWidth: 0 },
    lineStyle: { color: 'source', opacity: 0.35 },
  },
});

registerTheme('flat', {
  color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1'],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: "'Outfit', sans-serif",
    color: '#111827',
  },
  title: {
    textStyle: { color: '#111827', fontFamily: "'Outfit', sans-serif" },
    subtextStyle: { color: '#6B7280' },
  },
  legend: {
    textStyle: { color: '#111827' },
    pageTextStyle: { color: '#6B7280' },
    pageIconColor: '#3B82F6',
    pageIconInactiveColor: '#D1D5DB',
  },
  tooltip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    textStyle: {
      color: '#111827',
      fontFamily: "'Outfit', sans-serif",
      fontSize: 12,
    },
    extraCssText: 'border-radius: 8px; box-shadow: none;',
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#E5E7EB' } },
    axisTick: { lineStyle: { color: '#E5E7EB' } },
    axisLabel: { color: '#6B7280' },
    splitLine: { lineStyle: { color: '#F3F4F6' } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: '#E5E7EB' } },
    axisTick: { lineStyle: { color: '#E5E7EB' } },
    axisLabel: { color: '#6B7280' },
    splitLine: { lineStyle: { color: '#F3F4F6' } },
  },
  line: {
    symbol: 'circle',
    symbolSize: 6,
  },
  bar: {
    itemStyle: { borderWidth: 0 },
  },
  pie: {
    label: { color: '#374151' },
    itemStyle: { borderColor: '#FFFFFF', borderWidth: 2 },
  },
  sankey: {
    label: {
      color: '#111827',
      fontFamily: "'Outfit', sans-serif",
      fontWeight: 500,
    },
    itemStyle: { borderWidth: 0 },
    lineStyle: { color: 'source', opacity: 0.3 },
  },
});
