declare module 'react-native-svg-charts' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface LineChartProps extends ViewProps {
    data: number[];
    svg?: any;
    contentInset?: any;
    curve?: any;
  }

  export interface BarChartProps extends ViewProps {
    data: number[];
    svg?: any;
    contentInset?: any;
  }

  export interface XAxisProps extends ViewProps {
    data: any[];
    scale?: string;
    svg?: any;
    formatLabel?: (value: any, index: number) => string;
  }

  export interface YAxisProps extends ViewProps {
    data: number[];
    svg?: any;
    numberOfTicks?: number;
  }

  export class LineChart extends Component<LineChartProps> {}
  export class BarChart extends Component<BarChartProps> {}
  export class XAxis extends Component<XAxisProps> {}
  export class YAxis extends Component<YAxisProps> {}
}