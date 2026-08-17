/**
 * OSCrud — Gerenciador de Ordens de Serviço (v1.1.0)
 * MGV Assistência Técnica — Visualizador de Fluxo de OS
 *
 * CRUD completo: criar, listar, selecionar e excluir OS.
 * Persistência em localStorage com fallback para OS padrão (Caso Fabíola).
 * Integração com FSM via CustomEvents.
 */
(function () {
  'use strict';

  const osCrud = {
    osList: [],
    selectedOSId: null,
    container: null,

    init: function () {
      this.injectStyles();
      this.loadStorage();
      this.injectUI();
      this.registerEvents();
      this.notifyChanges();
    },

    injectStyles: function () {
      if (document.getElementById('mgv-crud-styles')) return;
      const styles = document.createElement('style');
      styles.id = 'mgv-crud-styles';
      styles.textContent = `
        .mgv-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0, 0, 0, 0.75); display: flex; align-items: center;
          justify-content: center; z-index: 1000; backdrop-filter: blur(4px);
        }
        .mgv-modal {
          background: var(--bg-card); border: 1px solid var(--border-color);
          border-radius: var(--radius-2xl); max-width: 480px; width: 90%;
          padding: 1.5rem; color: var(--text-main); font-family: var(--font-family);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; gap: 1rem;
          max-height: 90vh; overflow-y: auto;
        }
        .mgv-modal-header {
          display: flex; justify-content: space-between; align-items: center;
          border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;
        }
        .mgv-modal-header h4 { margin: 0; font-size: 1.1rem; color: var(--text-main); }
        .mgv-close-btn {
          background: none; border: none; color: var(--text-muted); font-size: 1.25rem;
          cursor: pointer; padding: 0.25rem;
        }
        .mgv-close-btn:hover { color: var(--text-main); }
        
        .whatsapp-chat {
          background: #e5ddd5; border-radius: 8px; padding: 1rem;
          display: flex; flex-direction: column; gap: 0.75rem; max-height: 250px; overflow-y: auto;
        }
        .whatsapp-bubble {
          background: #fff; color: #000; padding: 0.5rem 0.75rem; border-radius: 8px;
          max-width: 85%; font-size: 0.85rem; align-self: flex-start;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15); line-height: 1.4;
          white-space: pre-wrap;
        }
        .whatsapp-bubble.sent {
          background: #dcf8c6; align-self: flex-end;
        }
        
        .nfce-ticket {
          background: #fdfdfd; color: #000; font-family: 'Courier New', Courier, monospace;
          padding: 1.5rem 1rem; border: 1px solid #ccc; font-size: 0.75rem; line-height: 1.3;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 0.5rem;
        }
        .nfce-divider { border-top: 1px dashed #000; margin: 0.5rem 0; }
        .nfce-header { text-align: center; line-height: 1.4; }
        .nfce-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        .nfce-table th, .nfce-table td { text-align: left; padding: 0.15rem 0; font-size: 0.7rem; }
        .nfce-table .right { text-align: right; }
        .nfce-qrcode { display: flex; justify-content: center; margin: 1rem 0; }
        .nfce-qrcode svg { width: 120px; height: 120px; }
        
        .flex-btn-group { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
      `;
      document.head.appendChild(styles);
    },

    loadStorage: function () {
      const saved = localStorage.getItem('mgv:os_list');
      if (saved) {
        try {
          this.osList = JSON.parse(saved);
        } catch (e) {
          this.osList = [];
        }
      }

      if (this.osList.length === 0) {
        this.osList = [
          {
            id: "234813",
            client: "Fabíola",
            equipment: "Aparelho de Ultrassom Estético",
            status: "AGUARDANDO_PECA",
            billingStatus: "PAGO_PARCIAL",
            whatsappTermSent: false,
            whatsappAccepted: false,
            nfeIssued: false,
            created_at: new Date().toISOString()
          }
        ];
        this.saveStorage();
      }
      this.selectedOSId = this.osList[0].id;
    },

    saveStorage: function () {
      localStorage.setItem('mgv:os_list', JSON.stringify(this.osList));
    },

    injectUI: function () {
      const sidePanel = document.querySelector('.side-panel');
      if (!sidePanel) return;

      const crudCard = document.createElement('div');
      crudCard.className = 'panel-card purple-card';
      crudCard.id = 'os-crud-panel';

      const title = document.createElement('h3');
      title.textContent = '⚙️ Gerenciador de OS';

      const selectLabel = document.createElement('label');
      selectLabel.textContent = 'OS Selecionada:';
      selectLabel.style.fontSize = '0.75rem';
      selectLabel.style.fontWeight = 'bold';
      selectLabel.style.display = 'block';
      selectLabel.style.marginTop = '0.75rem';

      const select = document.createElement('select');
      select.id = 'crud-os-select';
      select.style.cssText = `
        width: 100%; padding: 0.5rem; margin-top: 0.25rem;
        background: var(--bg-main); border: 1px solid var(--border-color);
        border-radius: var(--radius-xl); color: var(--text-main); font-family: var(--font-family);
      `;
      
      this.populateSelect(select);

      const btnGrid = document.createElement('div');
      btnGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.75rem;';

      const btnAdd = document.createElement('button');
      btnAdd.className = 'btn btn-gold';
      btnAdd.id = 'btn-crud-add';
      btnAdd.textContent = '➕ Nova OS';
      btnAdd.setAttribute('aria-label', 'Adicionar nova ordem de serviço');

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-blue';
      btnEdit.id = 'btn-crud-edit';
      btnEdit.textContent = '✏️ Editar OS';
      btnEdit.setAttribute('aria-label', 'Editar dados da OS selecionada');

      const btnStatus = document.createElement('button');
      btnStatus.className = 'btn btn-green';
      btnStatus.id = 'btn-crud-status';
      btnStatus.textContent = '⚡ Alterar Status';
      btnStatus.setAttribute('aria-label', 'Alterar status com override');

      const btnDel = document.createElement('button');
      btnDel.className = 'btn btn-red';
      btnDel.id = 'btn-crud-delete';
      btnDel.textContent = '🗑️ Excluir';
      btnDel.setAttribute('aria-label', 'Excluir OS selecionada');

      btnGrid.appendChild(btnAdd);
      btnGrid.appendChild(btnEdit);
      btnGrid.appendChild(btnStatus);
      btnGrid.appendChild(btnDel);

      const fiscalLabel = document.createElement('label');
      fiscalLabel.textContent = 'Ações Reais & Fiscal:';
      fiscalLabel.style.fontSize = '0.75rem';
      fiscalLabel.style.fontWeight = 'bold';
      fiscalLabel.style.display = 'block';
      fiscalLabel.style.marginTop = '0.75rem';

      const fiscalGrid = document.createElement('div');
      fiscalGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.25rem;';

      const btnWhatsApp = document.createElement('button');
      btnWhatsApp.className = 'btn';
      btnWhatsApp.id = 'btn-crud-whatsapp';
      btnWhatsApp.style.background = '#25D366';
      btnWhatsApp.style.color = '#fff';
      btnWhatsApp.textContent = '💬 WhatsApp';
      btnWhatsApp.setAttribute('aria-label', 'Simular envio de termo via WhatsApp');

      const btnNFCe = document.createElement('button');
      btnNFCe.className = 'btn btn-gold';
      btnNFCe.id = 'btn-crud-nfce';
      btnNFCe.textContent = '🧾 Cupom NFC-e';
      btnNFCe.setAttribute('aria-label', 'Visualizar cupom fiscal NFC-e');

      fiscalGrid.appendChild(btnWhatsApp);
      fiscalGrid.appendChild(btnNFCe);

      crudCard.appendChild(title);
      crudCard.appendChild(selectLabel);
      crudCard.appendChild(select);
      crudCard.appendChild(btnGrid);
      crudCard.appendChild(fiscalLabel);
      crudCard.appendChild(fiscalGrid);

      sidePanel.insertBefore(crudCard, sidePanel.firstChild);
      this.container = crudCard;
    },

    populateSelect: function (selectElement) {
      const select = selectElement || document.getElementById('crud-os-select');
      if (!select) return;

      select.innerHTML = '';
      this.osList.forEach(os => {
        const option = document.createElement('option');
        option.value = os.id;
        option.textContent = `OS ${os.id} - ${os.client} (${os.status})`;
        if (os.id === this.selectedOSId) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    },

    createNewOS: function () {
      const clientInput = prompt("Nome do Cliente:");
      if (!clientInput) return;
      const client = clientInput.trim();

      const equipmentInput = prompt("Equipamento Estético:");
      if (!equipmentInput) return;
      const equipment = equipmentInput.trim();

      const newId = Math.floor(100000 + Math.random() * 900000).toString();
      const newOS = {
        id: newId,
        client: client,
        equipment: equipment,
        status: "AGUARDANDO_ORCAMENTO",
        billingStatus: "PENDENTE",
        whatsappTermSent: false,
        whatsappAccepted: false,
        nfeIssued: false,
        created_at: new Date().toISOString()
      };

      this.osList.push(newOS);
      this.selectedOSId = newId;
      this.saveStorage();
      this.populateSelect();
      this.notifyChanges();
    },

    editCurrentOS: function () {
      const activeOS = this.osList.find(o => o.id === this.selectedOSId);
      if (!activeOS) return;

      const newClient = prompt("Editar Cliente:", activeOS.client);
      if (newClient !== null && newClient.trim() !== "") {
        activeOS.client = newClient.trim();
      }

      const newEquip = prompt("Editar Equipamento:", activeOS.equipment);
      if (newEquip !== null && newEquip.trim() !== "") {
        activeOS.equipment = newEquip.trim();
      }

      this.saveStorage();
      this.populateSelect();
      this.notifyChanges();
    },

    overrideStatus: function () {
      const activeOS = this.osList.find(o => o.id === this.selectedOSId);
      if (!activeOS) return;

      const availableStatuses = [
        "AGUARDANDO_ORCAMENTO",
        "AGUARDANDO_APROVACAO",
        "RECUSA_ORCAMENTO",
        "EM_EXECUCAO",
        "AGUARDANDO_PECA",
        "TESTE_ESTRESSE",
        "PRONTO_RETIRADA",
        "CREDIARIO_FATURADO",
        "ABANDONO_INADIMPLENTE",
        "FINALIZADO",
        "GARANTIA_REABERTURA",
        "REABERTO"
      ];

      const inputStatus = prompt(
        `Alterar status da OS ${activeOS.id} (${activeOS.client}):\nOpções:\n${availableStatuses.join("\n")}`,
        activeOS.status
      );

      if (!inputStatus) return;
      const chosen = inputStatus.trim().toUpperCase();

      if (availableStatuses.includes(chosen)) {
        activeOS.status = chosen;
        this.saveStorage();
        this.populateSelect();
        this.notifyChanges();

        document.dispatchEvent(new CustomEvent('mgv:fsm-transition', {
          detail: { from: activeOS.status, to: chosen, label: 'Manual Override' }
        }));
      } else {
        alert("Status inválido. Escolha um dos status válidos listados.");
      }
    },

    deleteOS: function (osId) {
      const targetId = osId || this.selectedOSId;
      if (this.osList.length <= 1) {
        alert("Não é possível excluir a última OS.");
        return;
      }

      const os = this.osList.find(o => o.id === targetId);
      if (!os) return;

      if (!confirm(`Excluir OS ${targetId} (${os.client})?`)) return;

      this.osList = this.osList.filter(o => o.id !== targetId);
      if (this.selectedOSId === targetId) {
        this.selectedOSId = this.osList[0].id;
      }
      this.saveStorage();
      this.populateSelect();
      this.notifyChanges();
    },

    sendWhatsAppTerm: function () {
      const activeOS = this.osList.find(o => o.id === this.selectedOSId);
      if (!activeOS) return;

      const clientName = activeOS.client;
      const equipName = activeOS.equipment;

      const modalHtml = `
        <div class="mgv-modal-overlay" id="wa-modal-overlay">
          <div class="mgv-modal">
            <div class="mgv-modal-header">
              <h4>💬 WhatsApp (Termo de Retirada)</h4>
              <button class="mgv-close-btn" id="btn-close-wa-modal">✕</button>
            </div>
            
            <p style="font-size: 0.8rem; color: var(--text-muted);">Simulação de aceite de termo digital enviado para o WhatsApp do cliente.</p>
            
            <div class="whatsapp-chat">
              <div class="whatsapp-bubble">
                Olá, <strong>${clientName}</strong>!<br><br>
                Seu equipamento <strong>${equipName}</strong> (OS #${activeOS.id}) está pronto para <strong>Retirada Temporária</strong> enquanto a peça final está em trânsito.<br><br>
                *Termos:* O cliente declara ciência de que o reparo é provisório e compromete-se a retornar o aparelho assim que a peça definitiva chegar.<br><br>
                Confirma o aceite dos termos para retirada digital?
              </div>
              
              ${activeOS.whatsappAccepted ? `
                <div class="whatsapp-bubble sent">
                  Sim, aceito os termos de retirada provisória e confirmo os dados.
                </div>
              ` : ''}
            </div>
            
            <div class="flex-btn-group">
              ${!activeOS.whatsappAccepted ? `
                <button class="btn btn-green" id="btn-wa-simulate-accept" style="background:#25D366; color:#fff;">✔️ Simular Aceite pelo Cliente</button>
              ` : `
                <span style="color:#4ade80; font-weight:bold; font-size:0.8rem; display:flex; align-items:center; gap:0.25rem;">
                  ✔️ Aceite confirmado no histórico do WhatsApp.
                </span>
              `}
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);

      document.getElementById('btn-close-wa-modal').onclick = () => {
        document.getElementById('wa-modal-overlay').remove();
      };

      const btnAccept = document.getElementById('btn-wa-simulate-accept');
      if (btnAccept) {
        btnAccept.onclick = () => {
          activeOS.whatsappTermSent = true;
          activeOS.whatsappAccepted = true;
          this.saveStorage();
          this.notifyChanges();
          document.getElementById('wa-modal-overlay').remove();
          this.sendWhatsAppTerm();
        };
      }
    },

    showNFCeCupom: function () {
      const activeOS = this.osList.find(o => o.id === this.selectedOSId);
      if (!activeOS) return;

      const clientName = activeOS.client.toUpperCase();
      const dateStr = new Date(activeOS.created_at || new Date()).toLocaleString('pt-BR');
      const osId = activeOS.id;

      let itemCode = '25002415';
      let itemDesc = 'PCI MONTADA PCIK7W01R00 - PCI PAINEL NOVO US';
      let itemVal = 1200.00;

      if (osId !== '234813') {
        itemCode = '25002999';
        itemDesc = 'MANUTENÇÃO GERAL ' + activeOS.equipment.toUpperCase();
        itemVal = 850.00;
      }

      activeOS.nfeIssued = true;
      this.saveStorage();
      this.notifyChanges();

      const modalHtml = `
        <div class="mgv-modal-overlay" id="nfce-modal-overlay">
          <div class="mgv-modal" style="max-width: 420px; background: #fff; color: #000; font-family: monospace;">
            <div class="mgv-modal-header" style="border-bottom: 1px dashed #000; padding-bottom: 0.5rem; justify-content: space-between; display: flex;">
              <h4 style="color:#000; font-weight: bold; font-family: monospace; font-size: 1rem; margin: 0;">DANFE NFC-e</h4>
              <button class="mgv-close-btn" id="btn-close-nfce-modal" style="color:#000; background:none; border:none; font-size:1.2rem; cursor:pointer;">✕</button>
            </div>
            
            <div class="nfce-ticket" style="background:#fff; color:#000; padding:0.5rem 0;">
              <div class="nfce-header" style="text-align: center; font-size: 0.75rem;">
                <strong style="font-size: 0.85rem;">MGV RP ASSISTENCIA TECNICA</strong><br>
                <span>MOSAIAS LUIZ TEODORO LTDA - CNPJ: 24.181.336/0001-66</span><br>
                <span>RUA JULIO PRESTES, 648, JARDIM SUMARE, RIBEIRAO PRETO, SP</span><br>
                <span>IE: 797187310116 - Fone: (16) 9120-7187</span><br>
                <div class="nfce-divider"></div>
                <strong>DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA</strong>
              </div>
              
              <div class="nfce-divider"></div>
              
              <table class="nfce-table" style="width:100%; border-collapse: collapse; font-size:0.75rem;">
                <thead>
                  <tr style="border-bottom: 1px dashed #000;">
                    <th style="text-align:left;">CÓDIGO / DESCRIÇÃO</th>
                    <th style="text-align:right;">VL TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 0.2rem 0;"><strong>${itemCode}</strong> ${itemDesc}</td>
                    <td style="text-align:right; vertical-align:top; padding: 0.2rem 0;">${itemVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="font-size:0.7rem; color:#555; padding-bottom:0.4rem;">
                      Qtd: 1,0000 Un x ${itemVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div class="nfce-divider"></div>
              
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                <span>QTD TOTAL DE ITENS</span>
                <span>1</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 0.8rem; margin-top: 0.2rem;">
                <span>VALOR TOTAL R$</span>
                <span>${itemVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              
              <div class="nfce-divider"></div>
              
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                <span>Forma de Pagamento</span>
                <span>Valor Pago R$</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 0.75rem; margin-top: 0.1rem;">
                <span>Cartão de Crédito / Pix</span>
                <span>${itemVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                <span>Troco R$</span>
                <span>0,00</span>
              </div>
              
              <div class="nfce-divider"></div>
              
              <div style="text-align: center; font-size: 0.7rem; line-height: 1.4;">
                <span>Consulte pela Chave de Acesso em:</span><br>
                <span style="font-size: 0.65rem; color:#333; word-break: break-all;">https://www.nfce.fazenda.sp.gov.br/consulta</span><br>
                <strong style="font-size: 0.7rem;">3526 0524 1813 3600 0166 6500 1000 0002 1412 6000 2146</strong>
              </div>
              
              <div class="nfce-divider"></div>
              
              <div style="font-size: 0.7rem; line-height: 1.4;">
                <strong>CONSUMIDOR:</strong><br>
                CPF: 071.537.018-93 - RICARDO APAR ECIDO STELA<br>
                RUA ADOLFO SERRA, 872 - ALTO DA BOA VISTA - RIBEIRAO PRETO - SP
              </div>
              
              <div class="nfce-divider"></div>
              
              <div style="text-align: center; font-size: 0.7rem; line-height: 1.4;">
                <strong>NFC-e nº000000214 Série:1 - ${dateStr}</strong><br>
                <span>Protocolo de Autorização: 135263550140892</span><br>
                <span>Data de autorização: ${dateStr}</span>
              </div>
              
              <div class="nfce-qrcode" style="display:flex; justify-content:center; padding: 0.5rem 0;">
                <svg viewBox="0 0 100 100" style="width: 100px; height: 100px; background:#fff; padding: 5px; border: 1px solid #000;">
                  <rect x="10" y="10" width="20" height="20" fill="black"/>
                  <rect x="15" y="15" width="10" height="10" fill="white"/>
                  <rect x="70" y="10" width="20" height="20" fill="black"/>
                  <rect x="75" y="15" width="10" height="10" fill="white"/>
                  <rect x="10" y="70" width="20" height="20" fill="black"/>
                  <rect x="15" y="75" width="10" height="10" fill="white"/>
                  <rect x="40" y="20" width="10" height="15" fill="black"/>
                  <rect x="45" y="45" width="20" height="20" fill="black"/>
                  <rect x="25" y="40" width="10" height="10" fill="black"/>
                  <rect x="70" y="70" width="15" height="15" fill="black"/>
                </svg>
              </div>
              
              <div class="nfce-divider"></div>
              
              <div style="font-size: 0.65rem; text-align: center; line-height: 1.4;">
                DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL; NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI.<br>
                <strong style="font-size: 0.75rem;">ORDEM SERVICO NO:${osId}</strong><br>
                <span>Tributos aprox. IBPT: 20,6% federal, 12,0% Estadual</span>
              </div>
            </div>
            
            <div class="flex-btn-group">
              <button class="btn btn-blue" id="btn-print-nfce" style="background:#000; color:#fff; width:100%; font-family:monospace;">🖨️ Imprimir Cupom</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);

      document.getElementById('btn-close-nfce-modal').onclick = () => {
        document.getElementById('nfce-modal-overlay').remove();
      };
      
      document.getElementById('btn-print-nfce').onclick = () => {
        window.print();
      };
    },

    notifyChanges: function () {
      const activeOS = this.osList.find(os => os.id === this.selectedOSId);
      if (!activeOS) return;

      window.MGV.currentOS = activeOS;
      window.MGV.osList = this.osList;

      const eventUpdate = new CustomEvent('mgv:os-updated', { detail: { activeOS, list: this.osList } });
      document.dispatchEvent(eventUpdate);
    },

    registerEvents: function () {
      if (this.container) {
        this.container.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;

          if (btn.id === 'btn-crud-add') this.createNewOS();
          if (btn.id === 'btn-crud-edit') this.editCurrentOS();
          if (btn.id === 'btn-crud-status') this.overrideStatus();
          if (btn.id === 'btn-crud-delete') this.deleteOS();
          if (btn.id === 'btn-crud-whatsapp') this.sendWhatsAppTerm();
          if (btn.id === 'btn-crud-nfce') this.showNFCeCupom();
        });

        const select = this.container.querySelector('#crud-os-select');
        if (select) {
          select.addEventListener('change', (e) => {
            this.selectedOSId = e.target.value;
            this.notifyChanges();
          });
        }
      }

      document.addEventListener('mgv:fsm-transition', (e) => {
        if (e.detail && e.detail.to) {
          const activeOS = this.osList.find(os => os.id === this.selectedOSId);
          if (activeOS) {
            activeOS.status = e.detail.to;
            this.saveStorage();
            this.notifyChanges();
          }
        }
      });
    }
  };

  // Registra no namespace global
  window.MGV = window.MGV || {};
  window.MGV.crud = osCrud;

  // Inicializa o módulo quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => osCrud.init());
  } else {
    osCrud.init();
  }
})();
