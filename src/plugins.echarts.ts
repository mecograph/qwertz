import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { SankeyChart, LineChart, PieChart, BarChart, HeatmapChart } from 'echarts/charts';
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TitleComponent,
  VisualMapComponent,
} from 'echarts/components';

use([
  CanvasRenderer,
  SankeyChart,
  LineChart,
  PieChart,
  BarChart,
  HeatmapChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TitleComponent,
  VisualMapComponent,
]);
