import { useState } from 'react';
import { RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { RamalItem } from '../types/voip';
import { formatDuration, getDownSeconds } from '../utils/voipAnalytics';

interface OfflinePriorityTableProps {
  offlineRamais: RamalItem[];
  allRamais: RamalItem[];
  nowSeconds: number;
  onInspectRamal: (ramal: RamalItem) => void;
  onPingSingle: (ramal: RamalItem) => void;
  onDeleteRamal: (ramal: RamalItem) => void;
}

type TableView = 'offline_now' | 'most_errors';

export function OfflinePriorityTable({
  offlineRamais,
  allRamais,
  nowSeconds,
  onInspectRamal,
  onPingSingle,
  onDeleteRamal,
}: OfflinePriorityTableProps) {
  const [view, setView] = useState<TableView>('offline_now');

  const sortedOffline = [...offlineRamais].sort(
    (a, b) => getDownSeconds(b, nowSeconds) - getDownSeconds(a, nowSeconds)
  );

  const sortedMostErrors = [...allRamais]
    .filter((r) => r.errorCount > 0)
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 12);

  const rows = view === 'offline_now' ? sortedOffline : sortedMostErrors;

  return (
    <section
      aria-label="Detalhamento de ramais com erros"
      className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {view === 'offline_now'
              ? 'Ramais com Erro Neste Momento (Offline)'
              : 'Ramais com Mais Erros de Resposta Registrados'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {view === 'offline_now'
              ? 'Ordenados pelo maior tempo contínuo fora do ar'
              : 'Ordenados pela quantidade acumulada de falhas de resposta / timeout'}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Alternar lista prioritária"
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'offline_now'}
            onClick={() => setView('offline_now')}
            className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'offline_now'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Offline agora ({offlineRamais.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'most_errors'}
            onClick={() => setView('most_errors')}
            className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === 'most_errors'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Mais erros de resposta
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhum ramal com erro encontrado nesta visualização.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-5 py-3">Descrição</th>
                <th className="px-4 py-3">Bloco</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">MAC (Cisco)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Erros Resp.</th>
                <th className="px-4 py-3 text-right">Tempo em Erro</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {rows.map((r) => {
                const downSec = getDownSeconds(r, nowSeconds);
                const isOff = r.status === 'offline';
                return (
                  <tr
                    key={r.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <button
                        type="button"
                        onClick={() => onInspectRamal(r)}
                        className="text-left hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                      >
                        {r.Descrição}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {r.bloco}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 tabular-nums dark:text-blue-400">
                      {r['I.P']}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                      {r['I.P Cisco']}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {isOff ? (
                        <span className="text-red-600 dark:text-red-400">
                          Offline
                        </span>
                      ) : r.status === 'online' ? (
                        <span className="text-emerald-600 tabular-nums dark:text-emerald-400">
                          Online ({r.latency}ms)
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                      {r.errorCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums">
                      {isOff ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {formatDuration(downSec)}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onPingSingle(r)}
                          title="Testar ping agora"
                          aria-label={`Testar ping em ${r.Descrição}`}
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectRamal(r)}
                          title="Alterar IP ou detalhes"
                          aria-label={`Editar ${r.Descrição}`}
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRamal(r)}
                          title="Excluir ramal"
                          aria-label={`Excluir ${r.Descrição}`}
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
