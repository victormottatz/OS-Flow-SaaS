const fs = require('fs');
let content = fs.readFileSync('src/components/KanbanBoard.tsx', 'utf8');

const oldState = `  const [closingOS, setClosingOS] = useState<OrdemServico | null>(null);
  const [paymentModalOS, setPaymentModalOS] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [invoiceType, setInvoiceType] = useState("nenhum");`;

const newState = `  const [closingOS, setClosingOS] = useState<OrdemServico | null>(null);
  const [paymentModalOS, setPaymentModalOS] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [paymentDetails, setPaymentDetails] = useState<{ method: string; amount: number }[]>([]);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [invoiceType, setInvoiceType] = useState("nenhum");`;

content = content.replace(oldState, newState);

const oldModal = `              <button onClick={() => { setPaymentModalOS(null); setPaymentMethod(""); }} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { id: "CARTAO_CREDITO", label: "Cartão de Crédito", icon: "credit_card" },
                { id: "CARTAO_DEBITO", label: "Cartão de Débito", icon: "credit_card" },
                { id: "DINHEIRO", label: "Dinheiro", icon: "payments" },
                { id: "PIX", label: "Pix", icon: "qr_code_2" },
                { id: "BOLETO", label: "Boleto Bancário", icon: "description" }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={\`w-full flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold transition duration-150 cursor-pointer text-left hover:bg-slate-50 \${
                    paymentMethod === opt.id 
                      ? "border-emerald-500 bg-emerald-500/5 text-emerald-800 shadow-sm" 
                      : "border-slate-200 text-slate-700"
                  }\`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={\`material-symbols-outlined text-[18px] \${
                      paymentMethod === opt.id ? "text-emerald-600" : "text-slate-400"
                    }\`}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                  {paymentMethod === opt.id && (
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                  )}
                </button>
              ))}
            </div>

            {paymentModalOS.targetStatus === "FINALIZADO" && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="block text-xs font-extrabold text-slate-700">Tipo de Emissão Fiscal:</label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="nenhum">🚫 Não emitir documento (já emitido anteriormente)</option>
                  <option value="bifasico">🧾 Faturamento Bifásico (Peças + Mão de Obra)</option>
                  <option value="nfe">📦 Apenas NF-e (Modelo 55 - Produtos/Peças)</option>
                  <option value="nfce">🎫 Apenas NFC-e (Modelo 65 - Cupom Fiscal)</option>
                  <option value="nfse">⚙️ Apenas NFS-e (Serviços/Mão de Obra)</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setPaymentModalOS(null); setPaymentMethod(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!paymentMethod) {
                    alert("Por favor, selecione uma forma de pagamento.");
                    return;
                  }
                  setLoading(true);
                  try {
                    const token = localStorage.getItem("mgv_token") || "";
                    const res = await fetch(\`/api/ordens-servico/\${paymentModalOS.id}/status\`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${token}\` },
                      body: JSON.stringify({ 
                        status: paymentModalOS.targetStatus,
                        paymentMethod: paymentMethod,
                        invoiceType: invoiceType
                      })
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      alert(data.error || "Erro.");
                    } else {
                      setSuccessMsg("OS encerrada e pagamento registrado com sucesso!");
                      onRefresh();
                      setTimeout(() => setSuccessMsg(""), 1500);
                    }
                  } catch (e: any) {
                    alert(e.message);
                  } finally {
                    setLoading(false);
                    setPaymentModalOS(null);
                    setPaymentMethod("");
                  }
                }}
                disabled={!paymentMethod}
                className="flex-1 bg-emerald-650 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs shadow-sm flex items-center justify-center gap-1.5 disabled:bg-slate-200 disabled:text-slate-400"
              >
                <span className="material-symbols-outlined text-[16px]">task_alt</span>
                <span>Finalizar OS</span>
              </button>
            </div>`;

const newModal = `              <button onClick={() => { setPaymentModalOS(null); setPaymentMethod(""); setPaymentDetails([]); setPaymentNotes(""); setPaymentAmountInput(""); }} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700">Data do Pagamento</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-extrabold text-slate-700">Total a Pagar</label>
                <div className="w-full p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold text-center flex items-center justify-center">
                  R$ {(() => {
                    const osTarget = ordensServico.find(o => o.id === paymentModalOS.id);
                    if (!osTarget) return "0.00";
                    const tc = osTarget.totalCost || 0;
                    if (tc > 0) return tc.toFixed(2);
                    const labor = osTarget.laborCost || 0;
                    const partsCost = osTarget.usedParts && Array.isArray(osTarget.usedParts) ? osTarget.usedParts.reduce((s: number, p: any) => s + ((p.price || 0) * (p.quantity || 1)), 0) : 0;
                    return (labor + partsCost - (osTarget.discount || 0)).toFixed(2);
                  })()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700">Pagamentos Fracionados</label>
              
              {paymentDetails.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-2 max-h-32 overflow-y-auto mb-3">
                  {paymentDetails.map((pd, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-1.5 bg-white border border-slate-100 rounded shadow-sm">
                      <span className="font-semibold text-slate-700">{pd.method.replace('_', ' ')}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-600">R$ {pd.amount.toFixed(2)}</span>
                        <button type="button" onClick={() => setPaymentDetails(paymentDetails.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600">
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-xs px-1">
                    <span>Total Informado:</span>
                    <span className="text-emerald-700">R$ {paymentDetails.reduce((s, p) => s + p.amount, 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="" disabled>Forma...</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="PIX">Pix</option>
                  <option value="BOLETO">Boleto Bancário</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="R$ 0,00"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!paymentMethod) return alert("Selecione a forma.");
                    const val = parseFloat(paymentAmountInput);
                    if (isNaN(val) || val <= 0) return alert("Digite um valor válido.");
                    setPaymentDetails([...paymentDetails, { method: paymentMethod, amount: val }]);
                    setPaymentMethod("");
                    setPaymentAmountInput("");
                  }}
                  className="px-3 bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs hover:bg-indigo-200 transition"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-1 mt-3">
              <label className="block text-xs font-extrabold text-slate-700">Observações sobre o Pagamento</label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Detalhes (Ex: Pago pelo sócio, 3x no cartão com juros, etc.)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none h-16"
              ></textarea>
            </div>

            {paymentModalOS.targetStatus === "FINALIZADO" && (
              <div className="space-y-2 border-t border-slate-100 pt-3 mt-3">
                <label className="block text-xs font-extrabold text-slate-700">Tipo de Emissão Fiscal:</label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="nenhum">🚫 Não emitir documento (já emitido anteriormente)</option>
                  <option value="bifasico">🧾 Faturamento Bifásico (Peças + Mão de Obra)</option>
                  <option value="nfe">📦 Apenas NF-e (Modelo 55 - Produtos/Peças)</option>
                  <option value="nfce">🎫 Apenas NFC-e (Modelo 65 - Cupom Fiscal)</option>
                  <option value="nfse">⚙️ Apenas NFS-e (Serviços/Mão de Obra)</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-3 mt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setPaymentModalOS(null); setPaymentMethod(""); setPaymentDetails([]); setPaymentNotes(""); setPaymentAmountInput(""); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (paymentDetails.length === 0 && !paymentMethod) {
                    alert("Por favor, adicione pelo menos uma forma de pagamento ou selecione na lista.");
                    return;
                  }
                  
                  let finalDetails = [...paymentDetails];
                  let finalMainMethod = paymentMethod;
                  
                  if (finalDetails.length === 0 && paymentMethod) {
                    const osTarget = ordensServico.find(o => o.id === paymentModalOS.id);
                    let osVal = 0;
                    if (osTarget) {
                      osVal = osTarget.totalCost || 0;
                      if (osVal === 0) {
                        const labor = osTarget.laborCost || 0;
                        const partsCost = osTarget.usedParts && Array.isArray(osTarget.usedParts) ? osTarget.usedParts.reduce((s: number, p: any) => s + ((p.price || 0) * (p.quantity || 1)), 0) : 0;
                        osVal = labor + partsCost - (osTarget.discount || 0);
                      }
                    }
                    finalDetails = [{ method: paymentMethod, amount: osVal }];
                  } else if (finalDetails.length > 1) {
                    finalMainMethod = "MULTIPLO";
                  } else if (finalDetails.length === 1) {
                    finalMainMethod = finalDetails[0].method;
                  }

                  setLoading(true);
                  try {
                    const token = localStorage.getItem("mgv_token") || "";
                    const res = await fetch(\`/api/ordens-servico/\${paymentModalOS.id}/status\`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${token}\` },
                      body: JSON.stringify({ 
                        status: paymentModalOS.targetStatus,
                        paymentMethod: finalMainMethod,
                        paymentNotes,
                        paymentDate,
                        paymentDetails: finalDetails,
                        invoiceType: invoiceType
                      })
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      alert(data.error || "Erro.");
                    } else {
                      setSuccessMsg("OS encerrada e pagamento registrado com sucesso!");
                      onRefresh();
                      setTimeout(() => setSuccessMsg(""), 1500);
                    }
                  } catch (e: any) {
                    alert(e.message);
                  } finally {
                    setLoading(false);
                    setPaymentModalOS(null);
                    setPaymentMethod("");
                    setPaymentDetails([]);
                    setPaymentNotes("");
                    setPaymentAmountInput("");
                  }
                }}
                disabled={paymentDetails.length === 0 && !paymentMethod}
                className="flex-1 bg-emerald-650 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs shadow-sm flex items-center justify-center gap-1.5 disabled:bg-slate-200 disabled:text-slate-400"
              >
                <span className="material-symbols-outlined text-[16px]">task_alt</span>
                <span>Finalizar OS</span>
              </button>
            </div>`;

content = content.replace(oldModal, newModal);

if (content.indexOf("setPaymentNotes") === -1) {
  console.log("Erro: O replace do state falhou.");
}
if (content.indexOf("Pagamentos Fracionados") === -1) {
  console.log("Erro: O replace do modal falhou.");
}

fs.writeFileSync('src/components/KanbanBoard.tsx', content);
console.log("Substituição concluída!");
