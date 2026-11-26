import { Search, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import {
  BLOCOS_ORDER,
  BlocoKey,
  BlockSummary,
  CORES_BLOCOS,
  RamaisByBloco,
  RamalItem,
  RamalStatus,
} from '../types/voip';
import { formatDuration, getDownSeconds } from '../utils/voipAnalytics';

interface RamaisExplorerProps {
  ramaisByBloco: RamaisByBloco;
  blockSummaries: BlockSummary[];
  nowSeconds: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedBlock: BlocoKey | 'Todos';
  onSelectBlock: (b: BlocoKey | 'Todos') => void;
  statusFilter: RamalStatus | 'all';
  onStatusFilterChange: (s: RamalStatus | 'all') => void;
  onInspectRamal: (r: RamalItem) => void;
  onPingSingle: (r: RamalItem) => void;
  onDeleteRamal: (r: RamalItem) => void;
  onOpenAddModal: () => void;
}

const STATUS_RANK: Record<RamalStatus, number> = {
  offline: 0,
  online: 1,
  inactive: 2,
  waiting: 3,
};

export function RamaisExplorer({
  ramaisByBloco,
  blockSummaries,
  nowSeconds,
  searchQuery,
  onSearchChange,
  selectedBlock,
  onSelectBlock,
  statusFilter,
  onStatusFilterChange,
  onInspectRamal,
  onPingSingle,
  onDeleteRamal,
  onOpenAddModal,
}: RamaisExplorerProps) {
  const query = searchQuery.trim().toLowerCase();

  const visibleBlocks =
    selectedBlock === 'Todos' ? BLOCOS_ORDER : [selectedBlock];

  return (
    <section aria-label="Mapa de ramais por bloco" className="space-y-5">
      {/* Barra de filtros */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar descrição, IP ou MAC..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filtrar por status"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          >
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'offline', label: 'Com Erro' },
                { id: 'online', label: 'Online' },
                { id: 'inactive', label: 'Inativos' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === opt.id}
                onClick={() => onStatusFilterChange(opt.id)}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar bloco"
            value={selectedBlock}
            onChange={(e) =>
              onSelectBlock(e.target.value as BlocoKey | 'Todos')
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="Todos">Todos os blocos</option>
            {BLOCOS_ORDER.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Ramal
          </button>
        </div>
      </div>

      {/* Colunas / Blocos responsivos */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          visibleBlocks.length === 1
            ? 'md:grid-cols-1'
            : 'md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5'
        }`}
      >
        {visibleBlocks.map((bloco) => {
          const summary = blockSummaries.find((s) => s.bloco === bloco);
          const rawList = ramaisByBloco[bloco] ?? [];

          const filtered = rawList
            .filter((r) => {
              if (statusFilter !== 'all' && r.status !== statusFilter) {
                return false;
              }
              if (!query) return true;
              return (
                r.Descrição.toLowerCase().includes(query) ||
                r['I.P'].toLowerCase().includes(query) ||
                r['I.P Cisco'].toLowerCase().includes(query)
              );
            })
            .sort((a, b) => {
              const rankDiff =
                (STATUS_RANK[a.status] ?? 4) - (STATUS_RANK[b.status] ?? 4);
              if (rankDiff !== 0) return rankDiff;
              return a.Descrição.localeCompare(b.Descrição, 'pt-BR');
            });

          const blockColor = CORES_BLOCOS[bloco];
          const offlineInBlock = summary?.offline ?? 0;

          return (
            <div
              key={bloco}
              className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Cabeçalho do Bloco */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: blockColor }}
                    aria-hidden="true"
                  />
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {bloco}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs tabular-nums">
                  <span
                    className={
                      offlineInBlock > 0
                        ? 'font-semibold text-red-600 dark:text-red-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    {offlineInBlock} erros
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">/</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {rawList.length}
                  </span>
                </div>
              </div>

              {/* Lista de Cards do Bloco */}
              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/70">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    Nenhum ramal neste filtro.
                  </div>
                ) : (
                  filtered.map((ramal) => {
                    const isOff = ramal.status === 'offline';
                    const isOn = ramal.status === 'online';
                    const downSec = getDownSeconds(ramal, nowSeconds);

                    return (
                      <div
                        key={ramal.id}
                        className={`group px-4 py-3.5 transition-colors ${
                          isOff
                            ? 'bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/35'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectRamal(ramal)}
                            className="text-left text-sm font-medium text-slate-900 hover:text-blue-600 hover:underline dark:text-slate-100 dark:hover:text-blue-400"
                          >
                            {ramal.Descrição}
                          </button>
                          <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onPingSingle(ramal)}
                              title="Testar ping"
                              aria-label={`Testar ping em ${ramal.Descrição}`}
                              className="rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onInspectRamal(ramal)}
                              title="Alterar IP"
                              aria-label={`Editar ${ramal.Descrição}`}
                              className="rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRamal(ramal)}
                              title="Excluir ramal"
                              aria-label={`Excluir ${ramal.Descrição}`}
                              className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {ramal['I.P']}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{ramal['I.P Cisco']}</span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2 text-xs tabular-nums">
                          {isOff ? (
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              Offline · {formatDuration(downSec)}
                            </span>
                          ) : isOn ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              Online · {ramal.latency}ms
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">
                              Inativo
                            </span>
                          )}

                          {ramal.errorCount > 0 && (
                            <span className="text-slate-500 dark:text-slate-400">
                              {ramal.errorCount} falhas
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
