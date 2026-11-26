import {
  BLOCOS_ORDER,
  BlocoKey,
  BlockSummary,
  CORES_BLOCOS,
  RamaisByBloco,
  RamalItem,
} from '../types/voip';

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatShortDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${safe % 60}s`;
  return `${safe}s`;
}

export function getDownSeconds(ramal: RamalItem, nowSeconds: number): number {
  if (ramal.status !== 'offline' || !ramal.down_since) return 0;
  return Math.max(0, Math.floor(nowSeconds - ramal.down_since));
}

export function flattenRamais(data: RamaisByBloco): RamalItem[] {
  return BLOCOS_ORDER.flatMap((bloco) => data[bloco] ?? []);
}

export function computeBlockSummaries(
  data: RamaisByBloco,
  nowSeconds: number
): BlockSummary[] {
  return BLOCOS_ORDER.map((bloco) => {
    const list = data[bloco] ?? [];
    const onlineItems = list.filter((r) => r.status === 'online');
    const offlineItems = list.filter((r) => r.status === 'offline');
    const inactiveItems = list.filter((r) => r.status === 'inactive');

    const totalResponseErrors = list.reduce(
      (acc, r) => acc + (r.errorCount || 0),
      0
    );

    const maxDownSeconds = offlineItems.reduce((max, r) => {
      const d = getDownSeconds(r, nowSeconds);
      return d > max ? d : max;
    }, 0);

    const avgLatency =
      onlineItems.length > 0
        ? Math.round(
            onlineItems.reduce((acc, r) => acc + (r.latency || 0), 0) /
              onlineItems.length
          )
        : 0;

    const total = list.length;
    const errorRatePct =
      total > 0 ? Math.round((offlineItems.length / total) * 1000) / 10 : 0;

    return {
      bloco,
      color: CORES_BLOCOS[bloco],
      total,
      online: onlineItems.length,
      offline: offlineItems.length,
      inactive: inactiveItems.length,
      totalResponseErrors,
      maxDownSeconds,
      avgLatency,
      errorRatePct,
    };
  });
}

export function normalizeImportedJson(raw: unknown): RamaisByBloco {
  const result: RamaisByBloco = {
    'Bloco A': [],
    'Bloco B': [],
    'Bloco C': [],
    'Bloco D': [],
    'Bloco E': [],
  };

  if (!raw || typeof raw !== 'object') {
    throw new Error('Formato JSON inválido. Esperado objeto com blocos.');
  }

  const record = raw as Record<string, unknown>;
  const nowSec = Math.floor(Date.now() / 1000);

  for (const bloco of BLOCOS_ORDER) {
    const rawList = record[bloco];
    if (!Array.isArray(rawList)) continue;

    result[bloco] = rawList.map((entry, idx) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const mac = String(item['I.P Cisco'] ?? `SEP-IMPORT-${bloco}-${idx}`);
      const statusRaw = String(item.status ?? 'waiting').toLowerCase();
      const status =
        statusRaw === 'online' ||
        statusRaw === 'offline' ||
        statusRaw === 'inactive' ||
        statusRaw === 'waiting'
          ? statusRaw
          : 'waiting';

      const downSince =
        typeof item.down_since === 'number'
          ? item.down_since
          : status === 'offline'
          ? nowSec - (idx + 1) * 180
          : null;

      const errorCount =
        typeof item.errorCount === 'number'
          ? item.errorCount
          : typeof item.error_count === 'number'
          ? item.error_count
          : status === 'offline'
          ? 3 + (idx % 7)
          : 0;

      return {
        id: `${bloco}_${mac}_${idx}`,
        Modelo: String(item.Modelo ?? 'Cisco'),
        'I.P Cisco': mac,
        Descrição: String(item['Descrição'] ?? item.Descricao ?? 'Sem Nome'),
        'I.P': String(item['I.P'] ?? 'None'),
        status,
        latency: typeof item.latency === 'number' ? item.latency : 0,
        down_since: downSince,
        errorCount,
        lastLatencyPeak:
          typeof item.lastLatencyPeak === 'number'
            ? item.lastLatencyPeak
            : typeof item.latency === 'number'
            ? item.latency
            : 0,
        bloco,
      };
    });
  }

  return result;
}

export interface CompareResult {
  merged: RamaisByBloco;
  newCount: number;
  updatedCount: number;
  details: Array<{
    type: 'novo' | 'ip_atualizado';
    bloco: BlocoKey;
    descricao: string;
    mac: string;
    oldIp?: string;
    newIp: string;
  }>;
}

export function compareRamaisJson(
  current: RamaisByBloco,
  externalRaw: Record<string, unknown>
): CompareResult {
  const merged: RamaisByBloco = {
    'Bloco A': current['Bloco A'].map((r) => ({ ...r })),
    'Bloco B': current['Bloco B'].map((r) => ({ ...r })),
    'Bloco C': current['Bloco C'].map((r) => ({ ...r })),
    'Bloco D': current['Bloco D'].map((r) => ({ ...r })),
    'Bloco E': current['Bloco E'].map((r) => ({ ...r })),
  };

  let newCount = 0;
  let updatedCount = 0;
  const details: CompareResult['details'] = [];

  for (const bloco of BLOCOS_ORDER) {
    const extList = externalRaw[bloco];
    if (!Array.isArray(extList)) continue;

    for (let i = 0; i < extList.length; i++) {
      const itemNovo = (extList[i] ?? {}) as Record<string, unknown>;
      const macNovo = String(itemNovo['I.P Cisco'] ?? '');
      const ipNovo = String(itemNovo['I.P'] ?? 'None');
      const descNovo = String(
        itemNovo['Descrição'] ?? itemNovo.Descricao ?? 'Sem Nome'
      );

      const existing = merged[bloco].find(
        (r) => r['I.P Cisco'] === macNovo && macNovo !== ''
      );

      if (existing) {
        if (existing['I.P'] !== ipNovo) {
          details.push({
            type: 'ip_atualizado',
            bloco,
            descricao: existing.Descrição,
            mac: macNovo,
            oldIp: existing['I.P'],
            newIp: ipNovo,
          });
          existing['I.P'] = ipNovo;
          updatedCount++;
        }
      } else {
        merged[bloco].push({
          id: `${bloco}_${macNovo || Date.now()}_${i}`,
          Modelo: String(itemNovo.Modelo ?? 'Cisco'),
          'I.P Cisco': macNovo || `SEP-${Date.now()}-${i}`,
          Descrição: descNovo,
          'I.P': ipNovo,
          status: 'waiting',
          latency: 0,
          down_since: null,
          errorCount: 0,
          bloco,
        });
        details.push({
          type: 'novo',
          bloco,
          descricao: descNovo,
          mac: macNovo,
          newIp: ipNovo,
        });
        newCount++;
      }
    }
  }

  return { merged, newCount, updatedCount, details };
}

export function exportRamaisCsv(data: RamaisByBloco, nowSeconds: number): void {
  const header = ['Bloco', 'Descrição', 'IP', 'MAC', 'Status', 'Latência (ms)', 'Erros de Resposta', 'Tempo Fora'];
  const rows = [header.join(';')];

  for (const bloco of BLOCOS_ORDER) {
    for (const r of data[bloco]) {
      const down = r.status === 'offline' ? formatDuration(getDownSeconds(r, nowSeconds)) : '00:00:00';
      rows.push(
        [
          bloco,
          `"${r.Descrição.replace(/"/g, '""')}"`,
          r['I.P'],
          r['I.P Cisco'],
          r.status,
          String(r.latency),
          String(r.errorCount),
          down,
        ].join(';')
      );
    }
  }

  const bom = '\uFEFF';
  const blob = new Blob([bom + rows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  a.href = url;
  a.download = `Relatorio_VoIP_${hh}-${mm}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportRamaisJsonFile(data: RamaisByBloco, prefix = 'Ramais_Atualizado'): void {
  const cleanOutput: Record<string, unknown[]> = {};
  for (const bloco of BLOCOS_ORDER) {
    cleanOutput[bloco] = data[bloco].map((r) => ({
      Modelo: r.Modelo ?? 'Cisco',
      'I.P Cisco': r['I.P Cisco'],
      Descrição: r.Descrição,
      'I.P': r['I.P'],
      status: r.status,
      latency: r.latency,
      down_since: r.down_since,
      errorCount: r.errorCount,
    }));
  }

  const blob = new Blob([JSON.stringify(cleanOutput, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const stamp = `${String(now.getDate()).padStart(2, '0')}${String(
    now.getMonth() + 1
  ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  a.href = url;
  a.download = `${prefix}_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
