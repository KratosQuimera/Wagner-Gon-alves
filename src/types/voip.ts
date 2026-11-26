export type BlocoKey = 'Bloco A' | 'Bloco B' | 'Bloco C' | 'Bloco D' | 'Bloco E';

export type RamalStatus = 'online' | 'offline' | 'inactive' | 'waiting';

export interface RamalItem {
  id: string;
  Modelo?: string;
  'I.P Cisco': string; // MAC (ex: SEP001122334455)
  Descrição: string;
  'I.P': string;
  status: RamalStatus;
  latency: number;
  down_since: number | null; // epoch seconds
  errorCount: number; // total response/ping errors recorded
  lastLatencyPeak?: number;
  bloco: BlocoKey;
}

export type RamaisByBloco = Record<BlocoKey, RamalItem[]>;

export interface ScanPoint {
  time: string;
  offlineCount: number;
  responseErrors: number;
  avgLatency: number;
}

export interface BlockSummary {
  bloco: BlocoKey;
  color: string;
  total: number;
  online: number;
  offline: number;
  inactive: number;
  totalResponseErrors: number;
  maxDownSeconds: number;
  avgLatency: number;
  errorRatePct: number;
}

export const BLOCOS_ORDER: BlocoKey[] = [
  'Bloco A',
  'Bloco B',
  'Bloco C',
  'Bloco D',
  'Bloco E',
];

export const CORES_BLOCOS: Record<BlocoKey, string> = {
  'Bloco A': '#3d5afe',
  'Bloco B': '#8e24aa',
  'Bloco C': '#00acc1',
  'Bloco D': '#fb8c00',
  'Bloco E': '#43a047',
};
