import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { BlockSummary, BlocoKey, RamalItem, ScanPoint } from '../types/voip';
import {
  formatDuration,
  formatShortDuration,
  getDownSeconds,
} from '../utils/voipAnalytics';

interface AnalyticsChartsProps {
  blockSummaries: BlockSummary[];
  allRamais: RamalItem[];
  scanHistory: ScanPoint[];
  nowSeconds: number;
  selectedBlock: BlocoKey | 'Todos';
  onSelectBlock: (bloco: BlocoKey | 'Todos') => void;
  onInspectRamal: (ramal: RamalItem) => void;
  isDark: boolean;
}

type RankingMode = 'erros' | 'tempo' | 'latencia';

export function AnalyticsCharts({
  blockSummaries,
  allRamais,
  scanHistory,
  nowSeconds,
  selectedBlock,
  onSelectBlock,
  onInspectRamal,
  isDark,
}: AnalyticsChartsProps) {
  const [rankingMode, setRankingMode] = useState<RankingMode>('erros');

  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';

  const blockChartData = useMemo(() => {
    return blockSummaries.map((b) => ({
      bloco: b.bloco,
      offline: b.offline,
      online: b.online,
      falhasAcumuladas: b.totalResponseErrors,
      maxDownFormatted: formatShortDuration(b.maxDownSeconds),
      color: b.color,
    }));
  }, [blockSummaries]);

  const rankingData = useMemo(() => {
    const filtered =
      selectedBlock === 'Todos'
        ? allRamais
        : allRamais.filter((r) => r.bloco === selectedBlock);

    if (rankingMode === 'erros') {
      return [...filtered]
        .filter((r) => r.errorCount > 0)
        .sort((a, b) => b.errorCount - a.errorCount)
        .slice(0, 7)
        .map((r) => ({
          id: r.id,
          nome:
            r.Descrição.length > 24
              ? r.Descrição.slice(0, 22) + '…'
              : r.Descrição,
          fullName: r.Descrição,
          bloco: r.bloco,
          ip: r['I.P'],
          status: r.status,
          valor: r.errorCount,
          unit: 'falhas',
          ramal: r,
        }));
    }

    if (rankingMode === 'tempo') {
      return [...filtered]
        .filter((r) => r.status === 'offline' && r.down_since)
        .map((r) => ({
          ramal: r,
          sec: getDownSeconds(r, nowSeconds),
        }))
        .sort((a, b) => b.sec - a.sec)
        .slice(0, 7)
        .map(({ ramal: r, sec }) => ({
          id: r.id,
          nome:
            r.Descrição.length > 24
              ? r.Descrição.slice(0, 22) + '…'
              : r.Descrição,
          fullName: r.Descrição,
          bloco: r.bloco,
          ip: r['I.P'],
          status: r.status,
          valor: Math.max(1, Math.round(sec / 60)), // minutos
          durationFormatted: formatDuration(sec),
          unit: 'min fora',
          ramal: r,
        }));
    }

    // latencia
    return [...filtered]
      .filter((r) => r.status === 'online' && r.latency > 0)
      .sort((a, b) => b.latency - a.latency)
      .slice(0, 7)
      .map((r) => ({
        id: r.id,
        nome:
          r.Descrição.length > 24
            ? r.Descrição.slice(0, 22) + '…'
            : r.Descrição,
        fullName: r.Descrição,
        bloco: r.bloco,
        ip: r['I.P'],
        status: r.status,
        valor: r.latency,
        unit: 'ms',
        ramal: r,
      }));
  }, [allRamais, selectedBlock, rankingMode, nowSeconds]);

  return (
    <section
      aria-label="Gráficos interativos de erros e latência"
      className="grid grid-cols-1 gap-4 lg:grid-cols-12"
    >
      {/* Gráfico 1: Blocos com Mais Erros */}
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Erros por Bloco Hospitalar
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Clique em uma barra para filtrar os ramais daquele bloco
            </p>
          </div>
          {selectedBlock !== 'Todos' && (
            <button
              type="button"
              onClick={() => onSelectBlock('Todos')}
              className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Limpar filtro ({selectedBlock})
            </button>
          )}
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={blockChartData}
              margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
              onClick={(state) => {
                if (state && state.activeLabel) {
                  const clicked = String(state.activeLabel) as BlocoKey;
                  onSelectBlock(
                    selectedBlock === clicked ? 'Todos' : clicked
                  );
                }
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={gridColor}
              />
              <XAxis
                dataKey="bloco"
                tick={{ fill: axisColor, fontSize: 12 }}
                axisLine={{ stroke: gridColor }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: axisColor, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{
                  fill: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.04)',
                }}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '0.5rem',
                  color: tooltipText,
                  fontSize: '12px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
                formatter={(value, name) => {
                  const val = value ?? 0;
                  if (name === 'offline') return [val, 'Offline agora'];
                  if (name === 'falhasAcumuladas')
                    return [val, 'Erros de resposta (acum.)'];
                  return [val, 'Online'];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                formatter={(val) =>
                  val === 'offline'
                    ? 'Offline agora'
                    : val === 'falhasAcumuladas'
                    ? 'Erros de resposta'
                    : 'Online'
                }
              />
              <Bar
                dataKey="offline"
                name="offline"
                radius={[4, 4, 0, 0]}
                className="cursor-pointer"
              >
                {blockChartData.map((entry) => (
                  <Cell
                    key={`off-${entry.bloco}`}
                    fill={
                      selectedBlock === 'Todos' ||
                      selectedBlock === entry.bloco
                        ? '#dc2626'
                        : isDark
                        ? '#451a1a'
                        : '#fecaca'
                    }
                  />
                ))}
              </Bar>
              <Bar
                dataKey="falhasAcumuladas"
                name="falhasAcumuladas"
                radius={[4, 4, 0, 0]}
                className="cursor-pointer"
              >
                {blockChartData.map((entry) => (
                  <Cell
                    key={`err-${entry.bloco}`}
                    fill={
                      selectedBlock === 'Todos' ||
                      selectedBlock === entry.bloco
                        ? '#d97706'
                        : isDark
                        ? '#452a0a'
                        : '#fde68a'
                    }
                  />
                ))}
              </Bar>
              <Bar
                dataKey="online"
                name="online"
                radius={[4, 4, 0, 0]}
                className="cursor-pointer"
              >
                {blockChartData.map((entry) => (
                  <Cell
                    key={`on-${entry.bloco}`}
                    fill={
                      selectedBlock === 'Todos' ||
                      selectedBlock === entry.bloco
                        ? '#16a34a'
                        : isDark
                        ? '#143321'
                        : '#bbf7d0'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Ranking Interativo (Mais erros de resposta / Maior tempo / Latência) */}
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {rankingMode === 'erros'
                ? 'Ramais com Mais Erros de Resposta'
                : rankingMode === 'tempo'
                ? 'Maior Tempo em Erro (Minutos Offline)'
                : 'Ramais com Maior Latência (ms)'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Clique em um item para inspecionar ou alterar o IP
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Modo do ranking"
            className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={rankingMode === 'erros'}
              onClick={() => setRankingMode('erros')}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                rankingMode === 'erros'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Mais erros
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rankingMode === 'tempo'}
              onClick={() => setRankingMode('tempo')}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                rankingMode === 'tempo'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Tempo fora
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rankingMode === 'latencia'}
              onClick={() => setRankingMode('latencia')}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                rankingMode === 'latencia'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Latência
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          {rankingData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Nenhum ramal correspondente neste filtro.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rankingData}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke={gridColor}
                />
                <XAxis
                  type="number"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={150}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{
                    fill: isDark
                      ? 'rgba(148, 163, 184, 0.08)'
                      : 'rgba(15, 23, 42, 0.04)',
                  }}
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '0.5rem',
                    color: tooltipText,
                    fontSize: '12px',
                  }}
                  formatter={(_val, _name, item) => {
                    const p = item.payload;
                    if (rankingMode === 'tempo') {
                      return [
                        `${p.durationFormatted} (${p.bloco} · ${p.ip})`,
                        'Tempo offline',
                      ];
                    }
                    return [
                      `${p.valor} ${p.unit} (${p.bloco} · ${p.ip})`,
                      p.fullName,
                    ];
                  }}
                />
                <Bar
                  dataKey="valor"
                  radius={[0, 4, 4, 0]}
                  className="cursor-pointer"
                  onClick={(barData) => {
                    const payload = (
                      barData as unknown as { payload?: { ramal?: RamalItem } }
                    )?.payload;
                    if (payload?.ramal) {
                      onInspectRamal(payload.ramal);
                    }
                  }}
                >
                  {rankingData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={
                        rankingMode === 'erros'
                          ? entry.status === 'offline'
                            ? '#dc2626'
                            : '#ea580c'
                          : rankingMode === 'tempo'
                          ? '#d97706'
                          : '#2563eb'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráfico 3: Evolução nas Varreduras */}
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Evolução de Erros nas Últimas Varreduras
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Acompanhamento de ramais offline e falhas de resposta a cada ciclo de verificação (intervalo de 10 min)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            <span>{scanHistory.length} ciclos registrados</span>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={scanHistory}
              margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradRespErr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOff" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={gridColor}
              />
              <XAxis
                dataKey="time"
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={{ stroke: gridColor }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '0.5rem',
                  color: tooltipText,
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }}
              />
              <Area
                type="monotone"
                dataKey="responseErrors"
                name="Erros de resposta no ciclo"
                stroke="#d97706"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradRespErr)"
              />
              <Area
                type="monotone"
                dataKey="offlineCount"
                name="Ramais offline"
                stroke="#dc2626"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradOff)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
