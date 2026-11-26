import { useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { BLOCOS_ORDER, BlocoKey, RamalItem } from '../types/voip';
import { formatDuration, getDownSeconds } from '../utils/voipAnalytics';

interface InspectModalProps {
  ramal: RamalItem | null;
  nowSeconds: number;
  onClose: () => void;
  onSaveIp: (ramal: RamalItem, newIp: string, newDesc: string) => void;
  onPingSingle: (ramal: RamalItem) => void;
  onDelete: (ramal: RamalItem) => void;
}

export function InspectRamalModal({
  ramal,
  nowSeconds,
  onClose,
  onSaveIp,
  onPingSingle,
  onDelete,
}: InspectModalProps) {
  const [ipValue, setIpValue] = useState('');
  const [descValue, setDescValue] = useState('');

  useEffect(() => {
    if (ramal) {
      setIpValue(ramal['I.P']);
      setDescValue(ramal.Descrição);
    }
  }, [ramal]);

  if (!ramal) return null;

  const downSec = getDownSeconds(ramal, nowSeconds);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveIp(ramal, ipValue.trim() || 'None', descValue.trim() || ramal.Descrição);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspect-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2
              id="inspect-modal-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Detalhes e Alteração de IP
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {ramal.bloco} · {ramal.Modelo ?? 'Cisco VoIP'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Resumo de telemetria */}
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Status
              </div>
              <div
                className={`mt-1 text-sm font-semibold ${
                  ramal.status === 'offline'
                    ? 'text-red-600 dark:text-red-400'
                    : ramal.status === 'online'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500'
                }`}
              >
                {ramal.status === 'offline'
                  ? 'Offline'
                  : ramal.status === 'online'
                  ? `Online (${ramal.latency}ms)`
                  : 'Inativo'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Erros resposta
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                {ramal.errorCount} falhas
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Tempo em erro
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                {ramal.status === 'offline' ? formatDuration(downSec) : '00:00:00'}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Descrição do Ramal
              </label>
              <input
                type="text"
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Novo Endereço IP
                </label>
                <input
                  type="text"
                  value={ipValue}
                  onChange={(e) => setIpValue(e.target.value)}
                  placeholder="Ex: 10.10.12.105"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  MAC Address (I.P Cisco)
                </label>
                <input
                  type="text"
                  value={ramal['I.P Cisco']}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPingSingle(ramal)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Testar Ping
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(ramal);
                }}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Excluir
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Salvar Alteração
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddRamalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: {
    bloco: BlocoKey;
    descricao: string;
    ip: string;
    mac: string;
    modelo: string;
  }) => void;
}

export function AddRamalModal({ isOpen, onClose, onAdd }: AddRamalModalProps) {
  const [descricao, setDescricao] = useState('');
  const [ip, setIp] = useState('');
  const [mac, setMac] = useState('');
  const [bloco, setBloco] = useState<BlocoKey>('Bloco A');
  const [modelo, setModelo] = useState('Cisco 7821');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return;
    onAdd({
      bloco,
      descricao: descricao.trim(),
      ip: ip.trim() || 'None',
      mac: mac.trim() || `SEP${Date.now().toString(16).toUpperCase()}`,
      modelo: modelo.trim() || 'Cisco',
    });
    setDescricao('');
    setIp('');
    setMac('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2
            id="add-modal-title"
            className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Cadastrar Novo Ramal
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Descrição
            </label>
            <input
              type="text"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Posto Enfermagem 4º Andar"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Bloco
              </label>
              <select
                value={bloco}
                onChange={(e) => setBloco(e.target.value as BlocoKey)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {BLOCOS_ORDER.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Modelo
              </label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Endereço IP
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="10.10.12.150"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                MAC (SEP...)
              </label>
              <input
                type="text"
                value={mac}
                onChange={(e) => setMac(e.target.value)}
                placeholder="SEP00A38E..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Salvar Ramal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ConfirmDeleteModalProps {
  ramal: RamalItem | null;
  onCancel: () => void;
  onConfirm: (ramal: RamalItem) => void;
}

export function ConfirmDeleteModal({
  ramal,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!ramal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <h2
          id="delete-modal-title"
          className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          Excluir Ramal
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Deseja remover{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {ramal.Descrição}
          </span>{' '}
          ({ramal['I.P']}) de {ramal.bloco}?
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(ramal)}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}
