import { AlertTriangle, Clock, Building2, Activity } from 'lucide-react';
import { BlockSummary, BlocoKey, RamalItem } from '../types/voip';
import { formatDuration, getDownSeconds } from '../utils/voipAnalytics';

interface KpiCardsProps {
  totalRamais: number;
  offlineRamais: RamalItem[];
  onlineCount: number;
  longestDownRamal: RamalItem | null;
  topResponseErrorRamal: RamalItem | null;
  topErrorBlock: BlockSummary | null;
  nowSeconds: number;
  onFilterOffline: () => void;
  onSelectBlock: (bloco: BlocoKey) => void;
  onInspectRamal: (ramal: RamalItem) => void;
}

export function KpiCards({
  totalRamais,
  offlineRamais,
  onlineCount,
  longestDownRamal,
  topResponseErrorRamal,
  topErrorBlock,
  nowSeconds,
  onFilterOffline,
  onSelectBlock,
  onInspectRamal,
}: KpiCardsProps) {
  const offlineCount = offlineRamais.length;
  const offlinePct =
    totalRamais > 0 ? Math.round((offlineCount / totalRamais) * 1000) / 10 : 0;

  const maxDownSec = longestDownRamal
    ? getDownSeconds(longestDownRamal, nowSeconds)
    : 0;

  return (
    <section
      aria-label="Indicadores principais de erros VoIP"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* 1. Quais estão com erros agora */}
      <button
        type="button"
        onClick={onFilterOffline}
        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-red-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-red-800/80 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Com erro neste momento
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2.5">
          <span className="font-mono text-3xl font-bold tracking-tight text-red-600 tabular-nums dark:text-red-400">
            {offlineCount}
          </span>
          <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
            de {totalRamais} ramais ({offlinePct}%)
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800/80 dark:text-slate-400">
          <span className="tabular-nums">{onlineCount} online</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-blue-600 group-hover:underline dark:text-blue-400">
            Ver ramais offline
          </span>
        </div>
      </button>

      {/* 2. Qual o maior tempo de erro */}
      <button
        type="button"
        onClick={() => longestDownRamal && onInspectRamal(longestDownRamal)}
        disabled={!longestDownRamal}
        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-amber-300 disabled:cursor-default dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-800/80 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Maior tempo em erro
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-3">
          <div className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
            {longestDownRamal ? formatDuration(maxDownSec) : '00:00:00'}
          </div>
          <p className="mt-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
            {longestDownRamal
              ? longestDownRamal.Descrição
              : 'Nenhum ramal fora do ar'}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
          {longestDownRamal ? (
            <>
              <span>{longestDownRamal.bloco}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {longestDownRamal['I.P']}
              </span>
            </>
          ) : (
            <span>Todos os ramais respondendo</span>
          )}
        </div>
      </button>

      {/* 3. Quais blocos mostram mais erros */}
      <button
        type="button"
        onClick={() => topErrorBlock && onSelectBlock(topErrorBlock.bloco)}
        disabled={!topErrorBlock}
        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-blue-300 disabled:cursor-default dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800/80 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Bloco com mais erros
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Building2 className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2.5">
          <span className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {topErrorBlock ? topErrorBlock.bloco : '—'}
          </span>
          {topErrorBlock && (
            <span className="font-mono text-sm font-semibold text-red-600 tabular-nums dark:text-red-400">
              {topErrorBlock.offline} offline
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
          {topErrorBlock ? (
            <>
              <span className="tabular-nums">
                {topErrorBlock.totalResponseErrors} falhas acumuladas
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {topErrorBlock.errorRatePct}% taxa
              </span>
            </>
          ) : (
            <span>Sem dados</span>
          )}
        </div>
      </button>

      {/* 4. Quais apresentam mais erros de resposta */}
      <button
        type="button"
        onClick={() =>
          topResponseErrorRamal && onInspectRamal(topResponseErrorRamal)
        }
        disabled={!topResponseErrorRamal}
        className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-purple-300 disabled:cursor-default dark:border-slate-800 dark:bg-slate-900 dark:hover:border-purple-800/80 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Mais erros de resposta
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
            <Activity className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
              {topResponseErrorRamal ? topResponseErrorRamal.errorCount : 0}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              falhas registradas
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
            {topResponseErrorRamal
              ? topResponseErrorRamal.Descrição
              : 'Sem falhas registradas'}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
          {topResponseErrorRamal ? (
            <>
              <span>{topResponseErrorRamal.bloco}</span>
              <span aria-hidden="true">·</span>
              <span>
                {topResponseErrorRamal.status === 'offline'
                  ? 'Offline agora'
                  : `Latência ${topResponseErrorRamal.latency}ms`}
              </span>
            </>
          ) : (
            <span>Histórico limpo</span>
          )}
        </div>
      </button>
    </section>
  );
}
