/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Client, Device, OrdemServico } from "../types";
import AppLogo from "./AppLogo";
import { COMPANY, DocumentSection, DocumentTemplate, getDocumentTotal } from "../config/documents.config";

interface DocumentShellProps {
  /** Modelo configurado (veja src/config/documents.config.ts). */
  template: DocumentTemplate;
  /** OS que origina o documento. */
  os: OrdemServico;
  /** Cliente — opcional se `os.client` já vier preenchido. */
  client?: Client | null;
  /** Equipamento — opcional se `os.device` já vier preenchido. */
  device?: Device | null;
  /** true = oculto na tela (só aparece na impressão), usado em listagens. */
  hidden?: boolean;
  /** Data exibida no cabeçalho (padrão: os.createdAt). */
  dataEmissao?: string;
}

/**
 * Renderiza um documento imprimível a partir de um `DocumentTemplate`.
 *
 * O bloco usa a classe global `.printable-area` (ver src/index.css): em
 * impressão, o CSS global esconde todo o resto da página e mostra apenas o
 * documento — sem necessidade de `<style>` por componente. Em tela, use a
 * prop `hidden` para escondê-lo (padrão usado em listagens).
 */
export default function DocumentShell({
  template,
  os,
  client,
  device,
  hidden = false,
  dataEmissao
}: DocumentShellProps) {
  const clientData = client ?? os.client ?? null;
  const deviceData = device ?? os.device ?? null;
  const dataExibida = dataEmissao ?? os.createdAt;
  const total = getDocumentTotal(os);
  const wants = (section: DocumentSection) => template.secoes.includes(section);

  return (
    <div
      id={`printable-${template.id}`}
      className={`printable-area bg-white border border-slate-200 rounded-2xl p-8 shadow-premium text-slate-900 max-w-3xl mx-auto print:border-none print:shadow-none font-sans relative overflow-hidden ${template.textBase || ""} ${
        hidden ? "hidden print:block" : ""
      }`}
    >
      {/* Barra de acento superior (identidade visual por documento) */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${template.corAcentual}`} />

      {/* Cabeçalho: logo + razão social + selo + nº da OS */}
      <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
        <div>
          <AppLogo className="h-10 w-auto object-contain mb-3" />
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono tracking-wider font-semibold">
            {COMPANY.razaoSocial}
          </p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{COMPANY.cnpj}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{COMPANY.endereco}</p>
        </div>
        <div className="flex flex-col items-end text-right w-full sm:w-auto">
          <span
            className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full font-mono border ${template.badgeClasse}`}
          >
            {template.titulo}
          </span>
          <p className="text-3xl font-mono font-bold mt-3 text-slate-950 tracking-tight">{os.osNumber}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            {template.dataRotulo}:{" "}
            {new Date(dataExibida).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </p>

          {/* Código de barras simulado (termo de recebimento) */}
          {template.mostrarCodigoBarras && (
            <div className="mt-3 flex flex-col items-center justify-center p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-end space-x-[2px] h-6 opacity-85">
                <div className="w-[2px] h-full bg-slate-900" />
                <div className="w-[1px] h-full bg-slate-900" />
                <div className="w-[3px] h-full bg-slate-900" />
                <div className="w-[1px] h-full bg-slate-900" />
                <div className="w-[2px] h-full bg-slate-900" />
                <div className="w-[4px] h-full bg-slate-900" />
                <div className="w-[1px] h-full bg-slate-900" />
                <div className="w-[2px] h-full bg-slate-900" />
                <div className="w-[3px] h-full bg-slate-900" />
                <div className="w-[1px] h-full bg-slate-900" />
              </div>
              <span className="text-[8px] font-mono text-slate-500 tracking-widest mt-0.5">MGV-{os.osNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cliente + Equipamento (lado a lado) */}
      {(wants("cliente") || wants("equipamento")) && (
        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {wants("cliente") && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center">
                <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600">how_to_reg</span>
                Dados do Proprietário
              </h4>
              <p className="font-bold text-slate-950 text-sm">{clientData?.name || "N/D"}</p>
              <p className="mt-1.5 font-medium text-slate-700">
                Documento: <span className="font-mono">{clientData?.cpfCnpj || "N/D"}</span>
              </p>
              <p className="font-medium text-slate-700">
                Contato: <span className="font-mono">{clientData?.phone || "N/D"}</span>
              </p>
              {clientData?.address && (
                <p className="mt-1.5 text-slate-500 font-medium">Endereço: {clientData.address}</p>
              )}
            </div>
          )}

          {wants("equipamento") && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center">
                <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600">devices</span>
                Equipamento em Custódia
              </h4>
              <p className="font-bold text-slate-950 text-sm">
                {deviceData?.type} {deviceData?.brand ? `- ${deviceData.brand}` : ""}
              </p>
              <p className="mt-1 font-medium text-slate-700">Modelo: {deviceData?.model || "N/D"}</p>
              <p className="font-mono text-xs font-semibold">
                N/S:{" "}
                <span className="bg-slate-200/70 px-1.5 py-0.5 rounded font-bold text-slate-800">
                  {deviceData?.serialNumber || "Sem Série"}
                </span>
              </p>
              {deviceData?.description && (
                <p className="pt-1.5 text-slate-500 italic text-[11px]">Estética: {deviceData.description}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Demais seções, na ordem em que aparecem na tela */}
      <div className="space-y-4 border-t border-slate-200 pt-5">
        {wants("defeitoRelatado") && (
          <div>
            <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1.5 flex items-center">
              <span className="material-symbols-outlined text-[16px] mr-1.5 text-indigo-600">build</span>
              Defeito Relatado pelo Solicitante
            </h4>
            <p className="p-3 bg-slate-50/75 border border-slate-200 rounded-xl italic text-slate-800 leading-relaxed font-medium">
              "{os.reportedDefect || "N/D"}"
            </p>
          </div>
        )}

        {(wants("acessorios") || wants("estadoFisico")) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wants("acessorios") && (
              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1 flex items-center">
                  <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600">check_box</span>
                  Acessórios Deixados na Oficina
                </h4>
                <p className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-slate-700 font-medium">
                  {os.accessoriesLeft || "Nenhum acessório adicional entregue."}
                </p>
              </div>
            )}
            {wants("estadoFisico") && (
              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1 flex items-center">
                  <span className="material-symbols-outlined text-[16px] mr-1.5 text-slate-600">info</span>
                  Estado Físico / Condições do Dispositivo
                </h4>
                <p className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-slate-700 font-medium">
                  {os.physicalState || "Sem avarias visuais descritas."}
                </p>
              </div>
            )}
          </div>
        )}

        {wants("checklistEntrada") && os.checklistEntrada && os.checklistEntrada.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2 flex items-center">
              <span className="material-symbols-outlined text-[16px] mr-1.5 text-indigo-600">fact_check</span>
              Checklist de Entrada do Equipamento
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/50">
              {os.checklistEntrada.map((item) => (
                <div
                  key={item.id}
                  className="text-[10px] border-b border-slate-100 pb-1 last:border-0 flex flex-col justify-center"
                >
                  <span className="font-semibold text-slate-700 block truncate">{item.label}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                        item.status === "OK"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : item.status === "AVARIA"
                            ? "bg-rose-50 text-rose-700 border border-rose-100 font-extrabold"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {item.status === "OK" ? "OK" : item.status === "AVARIA" ? "AVARIA" : "N/A"}
                    </span>
                    {item.observacao && (
                      <span className="text-[9px] text-slate-550 italic truncate max-w-[90px]" title={item.observacao}>
                        ({item.observacao})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {wants("laudoTecnico") && (
          <div>
            <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">
              Laudo e Ações Técnicas
            </h4>
            <p className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 leading-relaxed font-medium font-mono whitespace-pre-wrap">
              {os.diagnostic || "Serviço efetuado com diagnóstico conclusivo da equipe técnica."}
            </p>
          </div>
        )}

        {wants("pecasAplicadas") && os.usedParts && os.usedParts.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2">
              Insumos e Peças Aplicadas
            </h4>
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 font-bold uppercase text-[8px] tracking-wider">
                  <th className="py-1.5 font-bold">Descrição da Peça</th>
                  <th className="py-1.5 text-center font-bold">Qtd</th>
                  <th className="py-1.5 text-right font-bold">Preço Un.</th>
                  <th className="py-1.5 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {os.usedParts.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 font-semibold">
                      {item.name} {item.serialNumber && `(N/S: ${item.serialNumber})`}
                    </td>
                    <td className="py-2 text-center font-mono font-bold">{item.quantity}</td>
                    <td className="py-2 text-right font-mono">R$ {item.price.toFixed(2)}</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {wants("resumoFinanceiro") && (
          <div className="p-3 bg-slate-950 text-white rounded flex justify-between items-center mt-6">
            <span className="text-[8px] uppercase tracking-wider font-bold">Resumo Financeiro da OS</span>
            <span className="font-mono font-bold text-sm text-emerald-400">
              Total: R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {wants("termosGarantia") && template.termosRodape && (
          <div className="mt-8 border-t border-slate-200 pt-5 text-[10px] text-slate-500 leading-relaxed space-y-2">
            <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
              {template.termosTitulo || "Termos de Garantia, Condições e Custódia da Assistência:"}
            </p>
            {template.termosRodape.map((termo, idx) => (
              <p key={idx}>{termo}</p>
            ))}
          </div>
        )}

        {wants("assinaturas") && (
          <div className="mt-14 grid grid-cols-2 gap-12 text-center text-[11px]">
            <div className="border-t-2 border-slate-700 pt-3">
              <p className="font-bold text-slate-900">{template.tecnicoAssinatura}</p>
              <p className="text-[9px] text-slate-500 font-medium mt-0.5">Assinatura / Carimbo</p>
            </div>
            <div className="border-t-2 border-slate-700 pt-3">
              <p className="font-bold text-slate-900">{clientData?.name || "Assinatura do Cliente"}</p>
              <p className="text-[9px] text-slate-500 font-medium mt-0.5">{template.clienteAssinatura}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
