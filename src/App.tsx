import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Network,
  FileJson2,
  Moon,
  Sun,
  RefreshCw,
  Menu,
  X,
  Plus,
  Download,
} from 'lucide-react';
import {
  BLOCOS_ORDER,
  BlocoKey,
  RamaisByBloco,
  RamalItem,
  RamalStatus,
  ScanPoint,
} from './types/voip';
import {
  createInitialRamaisData,
  createInitialScanHistory,
} from './data/sampleRamais';
import {
  computeBlockSummaries,
  exportRamaisCsv,
  flattenRamais,
  formatDuration,
  getDownSeconds,
} from './utils/voipAnalytics';
import { KpiCards } from './components/KpiCards';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { OfflinePriorityTable } from './components/OfflinePriorityTable';
import { RamaisExplorer } from './components/RamaisExplorer';
import { IntegrationPanel } from './components/IntegrationPanel';
import {
  AddRamalModal,
  ConfirmDeleteModal,
  InspectRamalModal,
} from './components/RamalModals';

type ActiveTab = 'overview' | 'blocks' | 'integration';

const SCAN_INTERVAL_SECONDS = 600;
const STORAGE_DATA_KEY = 'haoc_voip_ramais_v1';
const STORAGE_THEME_KEY = 'haoc_voip_theme';

export default function App() {
  // Tema (claro / escuro)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'light');
    }
  }, [isDark]);

  // Dados dos ramais
  const [ramaisByBloco, setRamaisByBloco] = useState<RamaisByBloco>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DATA_KEY);
      if (saved) return JSON.parse(saved) as RamaisByBloco;
    } catch {
      // ignora erro de parse
    }
    return createInitialRamaisData();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(ramaisByBloco));
    } catch {
      // ignora erro de cota
    }
  }, [ramaisByBloco]);

  const [scanHistory, setScanHistory] = useState<ScanPoint[]>(() =>
    createInitialScanHistory()
  );

  // Navegação e filtros
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<BlocoKey | 'Todos'>(
    'Todos'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RamalStatus | 'all'>('all');
  const [dataSourceLabel, setDataSourceLabel] = useState('Base Local HAOC');

  // Relógio em tempo real e progresso da varredura
  const [nowSeconds, setNowSeconds] = useState(() =>
    Math.floor(Date.now() / 1000)
  );
  const [scanCountdown, setScanCountdown] = useState(SCAN_INTERVAL_SECONDS);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(100);

  // Modais
  const [inspectedRamal, setInspectedRamal] = useState<RamalItem | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RamalItem | null>(null);

  // Tick de 1 segundo para cronômetros e contagem regressiva de varredura
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowSeconds(Math.floor(Date.now() / 1000));
      setScanCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Executa varredura quando contador zera
  useEffect(() => {
    if (scanCountdown === 0 && !isScanning) {
      runScanCycle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanCountdown]);

  const runScanCycle = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(12);
    setScanCountdown(SCAN_INTERVAL_SECONDS);

    let progress = 12;
    const stepTimer = window.setInterval(() => {
      progress += 22;
      if (progress >= 100) {
        window.clearInterval(stepTimer);
        setScanProgress(100);
        const now = Math.floor(Date.now() / 1000);

        setRamaisByBloco((prev) => {
          const updated: RamaisByBloco = {
            'Bloco A': [],
            'Bloco B': [],
            'Bloco C': [],
            'Bloco D': [],
            'Bloco E': [],
          };
          let cycleOffline = 0;
          let cycleErrors = 0;
          let latSum = 0;
          let latCount = 0;

          for (const b of BLOCOS_ORDER) {
            updated[b] = prev[b].map((r) => {
              if (r['I.P'] === 'None' || r.status === 'inactive') {
                return { ...r, status: 'inactive' as RamalStatus, latency: 0 };
              }

              // Mantém estabilidade realista com pequena variação de rede
              const roll = Math.random();
              let nextStatus: RamalStatus = r.status;
              let nextLatency = r.latency;
              let nextDown = r.down_since;
              let nextErrCount = r.errorCount;

              if (r.status === 'offline') {
                // 18% chance de recuperar em uma nova varredura
                if (roll < 0.18) {
                  nextStatus = 'online';
                  nextLatency = Math.floor(4 + Math.random() * 25);
                  nextDown = null;
                } else {
                  nextErrCount += 1;
                  cycleErrors += 1;
                  cycleOffline += 1;
                  if (!nextDown) nextDown = now;
                }
              } else {
                // online ou waiting: 4% chance de timeout pontual
                if (roll < 0.04) {
                  nextStatus = 'offline';
                  nextLatency = 0;
                  nextDown = now;
                  nextErrCount += 1;
                  cycleErrors += 1;
                  cycleOffline += 1;
                } else {
                  nextStatus = 'online';
                  const base = r.latency > 0 ? r.latency : 8;
                  nextLatency = Math.max(
                    1,
                    Math.round(base + (Math.random() * 10 - 5))
                  );
                  latSum += nextLatency;
                  latCount += 1;
                }
              }

              return {
                ...r,
                status: nextStatus,
                latency: nextLatency,
                down_since: nextDown,
                errorCount: nextErrCount,
              };
            });
          }

          const d = new Date();
          const label = `${String(d.getHours()).padStart(2, '0')}:${String(
            d.getMinutes()
          ).padStart(2, '0')}`;

          setScanHistory((hist) => [
            ...hist.slice(-11),
            {
              time: label,
              offlineCount: cycleOffline,
              responseErrors: Math.max(cycleErrors, cycleOffline),
              avgLatency: latCount > 0 ? Math.round(latSum / latCount) : 0,
            },
          ]);

          return updated;
        });

        setIsScanning(false);
      } else {
        setScanProgress(progress);
      }
    }, 140);
  };

  // Ping individual em um ramal
  const handlePingSingle = (target: RamalItem) => {
    const now = Math.floor(Date.now() / 1000);
    setRamaisByBloco((prev) => {
      const next = { ...prev };
      next[target.bloco] = prev[target.bloco].map((r) => {
        if (r.id !== target.id) return r;
        if (r['I.P'] === 'None') {
          return { ...r, status: 'inactive', latency: 0, down_since: null };
        }
        // Simula teste direto (80% de sucesso se IP válido)
        const ok = Math.random() > 0.25;
        if (ok) {
          return {
            ...r,
            status: 'online',
            latency: Math.floor(2 + Math.random() * 18),
            down_since: null,
          };
        }
        return {
          ...r,
          status: 'offline',
          latency: 0,
          down_since: r.down_since ?? now,
          errorCount: r.errorCount + 1,
        };
      });
      return next;
    });
  };

  // Alterar IP / Descrição (manual_change)
  const handleSaveIp = (target: RamalItem, newIp: string, newDesc: string) => {
    setRamaisByBloco((prev) => {
      const next = { ...prev };
      next[target.bloco] = prev[target.bloco].map((r) => {
        if (r.id !== target.id) return r;
        const isInactive = newIp === 'None' || newIp === '';
        return {
          ...r,
          Descrição: newDesc,
          'I.P': newIp,
          status: isInactive ? 'inactive' : r.status,
        };
      });
      return next;
    });
  };

  // Adicionar novo ramal (AddDialog)
  const handleAddRamal = (payload: {
    bloco: BlocoKey;
    descricao: string;
    ip: string;
    mac: string;
    modelo: string;
  }) => {
    const newItem: RamalItem = {
      id: `${payload.bloco}_${Date.now()}`,
      Modelo: payload.modelo,
      'I.P Cisco': payload.mac,
      Descrição: payload.descricao,
      'I.P': payload.ip,
      status: payload.ip === 'None' ? 'inactive' : 'online',
      latency: payload.ip === 'None' ? 0 : 6,
      down_since: null,
      errorCount: 0,
      bloco: payload.bloco,
    };

    setRamaisByBloco((prev) => ({
      ...prev,
      [payload.bloco]: [newItem, ...prev[payload.bloco]],
    }));
  };

  // Excluir ramal (confirm_delete)
  const handleConfirmDelete = (target: RamalItem) => {
    setRamaisByBloco((prev) => ({
      ...prev,
      [target.bloco]: prev[target.bloco].filter((r) => r.id !== target.id),
    }));
    setDeleteTarget(null);
  };

  // Métricas consolidadas
  const allRamais = useMemo(
    () => flattenRamais(ramaisByBloco),
    [ramaisByBloco]
  );

  const blockSummaries = useMemo(
    () => computeBlockSummaries(ramaisByBloco, nowSeconds),
    [ramaisByBloco, nowSeconds]
  );

  const offlineRamais = useMemo(
    () => allRamais.filter((r) => r.status === 'offline'),
    [allRamais]
  );

  const onlineCount = useMemo(
    () => allRamais.filter((r) => r.status === 'online').length,
    [allRamais]
  );

  const longestDownRamal = useMemo(() => {
    if (offlineRamais.length === 0) return null;
    return [...offlineRamais].sort(
      (a, b) => getDownSeconds(b, nowSeconds) - getDownSeconds(a, nowSeconds)
    )[0];
  }, [offlineRamais, nowSeconds]);

  const topResponseErrorRamal = useMemo(() => {
    const withErrors = allRamais.filter((r) => r.errorCount > 0);
    if (withErrors.length === 0) return null;
    return [...withErrors].sort((a, b) => b.errorCount - a.errorCount)[0];
  }, [allRamais]);

  const topErrorBlock = useMemo(() => {
    if (blockSummaries.length === 0) return null;
    return [...blockSummaries].sort((a, b) => {
      if (b.offline !== a.offline) return b.offline - a.offline;
      return b.totalResponseErrors - a.totalResponseErrors;
    })[0];
  }, [blockSummaries]);

  const countdownFormatted = useMemo(() => {
    const m = Math.floor(scanCountdown / 60);
    const s = scanCountdown % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [scanCountdown]);

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: 'overview', label: 'Painel de Erros', icon: LayoutDashboard },
    { id: 'blocks', label: 'Ramais por Bloco', icon: Network },
    { id: 'integration', label: 'JSON e Python', icon: FileJson2 },
  ];

  const handleSelectBlockFromDashboard = (bloco: BlocoKey | 'Todos') => {
    setSelectedBlock(bloco);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Backdrop mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar responsiva */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            HAOC VoIP
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}

          <div className="pt-5">
            <div className="px-3.5 pb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              Resumo dos blocos
            </div>
            <div className="space-y-1">
              {blockSummaries.map((b) => (
                <button
                  key={b.bloco}
                  type="button"
                  onClick={() => {
                    setSelectedBlock(b.bloco);
                    setActiveTab('blocks');
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3.5 py-2 text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/70"
                >
                  <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: b.color }}
                      aria-hidden="true"
                    />
                    {b.bloco}
                  </span>
                  <span
                    className={`font-mono tabular-nums ${
                      b.offline > 0
                        ? 'font-semibold text-red-600 dark:text-red-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {b.offline} err
                  </span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Próxima varredura</span>
            <span className="font-mono font-semibold text-amber-600 tabular-nums dark:text-amber-400">
              {countdownFormatted}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-blue-600 transition-all duration-150"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">{dataSourceLabel}</span>
            <span className="font-mono tabular-nums">
              {allRamais.length} ramais
            </span>
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar enxuta */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu lateral"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="hidden text-slate-400 sm:inline">
                  HAOC VoIP
                </span>
                <span className="hidden text-slate-300 sm:inline dark:text-slate-700">
                  /
                </span>
                <h1 className="truncate font-display text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-100">
                  {activeTab === 'overview'
                    ? 'Painel de Erros e Respostas'
                    : activeTab === 'blocks'
                    ? 'Monitoramento por Bloco'
                    : 'Integração Python e Ramais.json'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
              <span className="hidden sm:inline">
                {isDark ? 'Modo Claro' : 'Modo Escuro'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => exportRamaisCsv(ramaisByBloco, nowSeconds)}
              className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 md:inline-flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={runScanCycle}
              disabled={isScanning}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`}
              />
              <span>{isScanning ? 'Varrendo...' : 'Varredura'}</span>
            </button>
          </div>
        </header>

        {/* Área de conteúdo */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-6 p-4 sm:p-6">
          {activeTab === 'overview' && (
            <>
              {/* Barra de contexto rápido */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="tabular-nums">
                    Total: {allRamais.length} ramais
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
                    {onlineCount} online
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-red-600 tabular-nums dark:text-red-400">
                    {offlineRamais.length} com erro
                  </span>
                  {longestDownRamal && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        Maior queda:{' '}
                        {formatDuration(
                          getDownSeconds(longestDownRamal, nowSeconds)
                        )}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(true)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo Ramal
                  </button>
                </div>
              </div>

              <KpiCards
                totalRamais={allRamais.length}
                offlineRamais={offlineRamais}
                onlineCount={onlineCount}
                longestDownRamal={longestDownRamal}
                topResponseErrorRamal={topResponseErrorRamal}
                topErrorBlock={topErrorBlock}
                nowSeconds={nowSeconds}
                onFilterOffline={() => {
                  setStatusFilter('offline');
                  setSelectedBlock('Todos');
                  setActiveTab('blocks');
                }}
                onSelectBlock={(bloco) => {
                  setSelectedBlock(bloco);
                  setStatusFilter('all');
                  setActiveTab('blocks');
                }}
                onInspectRamal={(ramal) => setInspectedRamal(ramal)}
              />

              <AnalyticsCharts
                blockSummaries={blockSummaries}
                allRamais={allRamais}
                scanHistory={scanHistory}
                nowSeconds={nowSeconds}
                selectedBlock={selectedBlock}
                onSelectBlock={handleSelectBlockFromDashboard}
                onInspectRamal={(ramal) => setInspectedRamal(ramal)}
                isDark={isDark}
              />

              <OfflinePriorityTable
                offlineRamais={offlineRamais}
                allRamais={allRamais}
                nowSeconds={nowSeconds}
                onInspectRamal={(ramal) => setInspectedRamal(ramal)}
                onPingSingle={handlePingSingle}
                onDeleteRamal={(ramal) => setDeleteTarget(ramal)}
              />
            </>
          )}

          {activeTab === 'blocks' && (
            <RamaisExplorer
              ramaisByBloco={ramaisByBloco}
              blockSummaries={blockSummaries}
              nowSeconds={nowSeconds}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedBlock={selectedBlock}
              onSelectBlock={setSelectedBlock}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onInspectRamal={(ramal) => setInspectedRamal(ramal)}
              onPingSingle={handlePingSingle}
              onDeleteRamal={(ramal) => setDeleteTarget(ramal)}
              onOpenAddModal={() => setIsAddOpen(true)}
            />
          )}

          {activeTab === 'integration' && (
            <IntegrationPanel
              ramaisByBloco={ramaisByBloco}
              nowSeconds={nowSeconds}
              onReplaceData={(newData, label) => {
                setRamaisByBloco(newData);
                setDataSourceLabel(label);
              }}
              onResetDemo={() => {
                setRamaisByBloco(createInitialRamaisData());
                setScanHistory(createInitialScanHistory());
                setDataSourceLabel('Base Local HAOC');
              }}
            />
          )}
        </main>
      </div>

      {/* Modais */}
      <InspectRamalModal
        ramal={inspectedRamal}
        nowSeconds={nowSeconds}
        onClose={() => setInspectedRamal(null)}
        onSaveIp={handleSaveIp}
        onPingSingle={handlePingSingle}
        onDelete={(ramal) => setDeleteTarget(ramal)}
      />

      <AddRamalModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddRamal}
      />

      <ConfirmDeleteModal
        ramal={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
