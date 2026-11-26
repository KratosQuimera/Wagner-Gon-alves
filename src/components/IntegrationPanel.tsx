import { useState } from 'react';
import {
  Upload,
  GitCompare,
  Download,
  Copy,
  Check,
  Plug,
  RotateCcw,
} from 'lucide-react';
import { RamaisByBloco } from '../types/voip';
import {
  CompareResult,
  compareRamaisJson,
  exportRamaisCsv,
  exportRamaisJsonFile,
  normalizeImportedJson,
} from '../utils/voipAnalytics';

interface IntegrationPanelProps {
  ramaisByBloco: RamaisByBloco;
  nowSeconds: number;
  onReplaceData: (newData: RamaisByBloco, sourceLabel: string) => void;
  onResetDemo: () => void;
}

const FLASK_SNIPPET = `# Adicione no seu script Python (Flask) para enviar os dados ao painel web:
@web_app.route('/api/ramais')
def api_ramais():
    with data_lock:
        payload = json.loads(json.dumps(compartilhar_dados))
    resp = web_app.response_class(
        response=json.dumps(payload, ensure_ascii=False),
        status=200,
        mimetype='application/json'
    )
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp`;

export function IntegrationPanel({
  ramaisByBloco,
  nowSeconds,
  onReplaceData,
  onResetDemo,
}: IntegrationPanelProps) {
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    msg: string;
  } | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(
    null
  );
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:5000/api/ramais');
  const [loadingApi, setLoadingApi] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleImportJsonFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizeImportedJson(parsed);
      onReplaceData(normalized, file.name);
      setFeedback({
        type: 'ok',
        msg: `Arquivo "${file.name}" carregado com sucesso no painel.`,
      });
      setCompareResult(null);
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: `Erro ao ler JSON: ${err instanceof Error ? err.message : 'Formato inválido'}`,
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleCompareJsonFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const result = compareRamaisJson(ramaisByBloco, parsed);
      setCompareResult(result);
      setFeedback({
        type: 'ok',
        msg: `Comparação concluída: ${result.newCount} novos ramais e ${result.updatedCount} IPs atualizados.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: `Falha na comparação: ${err instanceof Error ? err.message : 'JSON inválido'}`,
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyMerged = () => {
    if (!compareResult) return;
    onReplaceData(compareResult.merged, 'Ramais Mesclado');
    exportRamaisJsonFile(compareResult.merged, 'Ramais_Atualizado');
    setFeedback({
      type: 'ok',
      msg: 'Alterações aplicadas ao painel e arquivo Ramais_Atualizado exportado.',
    });
  };

  const handleFetchFromPython = async () => {
    if (!apiUrl.trim()) return;
    setLoadingApi(true);
    setFeedback(null);
    try {
      const res = await fetch(apiUrl.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const normalized = normalizeImportedJson(json);
      onReplaceData(normalized, 'API Flask Local');
      setFeedback({
        type: 'ok',
        msg: 'Dados sincronizados com sucesso a partir da API Flask!',
      });
    } catch {
      setFeedback({
        type: 'err',
        msg: 'Não foi possível conectar ao servidor Flask local. Verifique se o Python está rodando com CORS liberado ou importe o arquivo Ramais.json manualmente.',
      });
    } finally {
      setLoadingApi(false);
    }
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(FLASK_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      aria-label="Integração com Python e gestão de Ramais.json"
      className="space-y-6"
    >
      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card 1: Importar / Comparar / Exportar JSON & CSV */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Importar, Comparar e Exportar Ramais.json
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Compatível diretamente com a estrutura de blocos do seu arquivo{' '}
              <span className="font-mono">Ramais.json</span> (Bloco A a E, I.P,
              I.P Cisco, Descrição e status).
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800">
                <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Carregar Ramais.json</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJsonFile}
                  className="sr-only"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800">
                <GitCompare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Comparar JSON (por MAC)</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleCompareJsonFile}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() => exportRamaisCsv(ramaisByBloco, nowSeconds)}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Exportar Relatório CSV (Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => exportRamaisJsonFile(ramaisByBloco, 'Ramais')}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                <span>Baixar JSON Atual</span>
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Restaurar conjunto padrão de demonstração
            </span>
            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar dados iniciais
            </button>
          </div>
        </div>

        {/* Card 2: Conexão Direta com o Flask do Código Python */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Conectar ao Seu Servidor Python (Flask)
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Adicione a rota JSON abaixo no seu script PyQt6/Flask para alimentar
            este dashboard em tempo real na rede local.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://10.x.x.x:5000/api/ramais"
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleFetchFromPython}
              disabled={loadingApi}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              <Plug className="h-3.5 w-3.5" />
              {loadingApi ? 'Sincronizando...' : 'Sincronizar API'}
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                Rota Flask para adicionar ao seu Python
              </span>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar código
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200">
              {FLASK_SNIPPET}
            </pre>
          </div>
        </div>
      </div>

      {/* Resultado da Comparação de JSON (quando houver) */}
      {compareResult && (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Resultado da Comparação (por MAC)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                {compareResult.newCount} novos ramais ·{' '}
                {compareResult.updatedCount} IPs atualizados
              </p>
            </div>
            <button
              type="button"
              onClick={handleApplyMerged}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Aplicar e Baixar JSON Mesclado
            </button>
          </div>

          {compareResult.details.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
              Nenhuma diferença encontrada entre o arquivo selecionado e os dados atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-5 py-2.5">Alteração</th>
                    <th className="px-4 py-2.5">Bloco</th>
                    <th className="px-4 py-2.5">Descrição</th>
                    <th className="px-4 py-2.5">MAC</th>
                    <th className="px-4 py-2.5">IP Anterior</th>
                    <th className="px-5 py-2.5">IP Novo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {compareResult.details.map((d, idx) => (
                    <tr key={`${d.mac}-${idx}`}>
                      <td className="px-5 py-2.5 font-medium">
                        {d.type === 'novo' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Novo Ramal
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            IP Atualizado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {d.bloco}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        {d.descricao}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">
                        {d.mac}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">
                        {d.oldIp ?? '—'}
                      </td>
                      <td className="px-5 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {d.newIp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
