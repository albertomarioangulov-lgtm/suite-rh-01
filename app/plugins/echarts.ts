import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, GaugeChart, HeatmapChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'

export default defineNuxtPlugin(() => {
  // ECharts usa APIs de navegador (canvas): el registro se ejecuta solo en
  // cliente, de forma síncrona, para que VChart siempre tenga los módulos
  // cargados al montar (evita gráficos en blanco por carrera de carga).
  if (!import.meta.client) return

  use([
    CanvasRenderer,
    BarChart,
    GaugeChart,
    HeatmapChart,
    LineChart,
    PieChart,
    GridComponent,
    LegendComponent,
    TitleComponent,
    TooltipComponent,
    VisualMapComponent,
  ])
})
