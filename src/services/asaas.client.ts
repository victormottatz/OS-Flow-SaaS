/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cliente de Integração com Asaas API v3 (Gateway de Pagamentos SaaS)
 */

import axios, { AxiosInstance } from "axios";

export interface AsaasCustomerInput {
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
}

export interface AsaasSubscriptionInput {
  customerId: string;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO";
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: "MONTHLY" | "ANNUALLY";
  description: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}

export class AsaasClient {
  private client: AxiosInstance | null = null;
  private isConfigured = false;

  constructor() {
    const apiKey = process.env.ASAAS_API_KEY;
    const env = process.env.ASAAS_ENVIRONMENT || "sandbox";
    const baseURL = env === "production" 
      ? "https://api.asaas.com/v3" 
      : "https://sandbox.asaas.com/api/v3";

    if (apiKey && apiKey.trim() !== "" && !apiKey.includes("sua_chave")) {
      this.client = axios.create({
        baseURL,
        headers: {
          access_token: apiKey.trim(),
          "Content-Type": "application/json"
        },
        timeout: 15000
      });
      this.isConfigured = true;
    }
  }

  public isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Cria ou localiza um cliente no Asaas
   */
  async findOrCreateCustomer(data: AsaasCustomerInput): Promise<{ id: string }> {
    if (!this.client) {
      throw new Error("Asaas API Key não configurada no ambiente (.env).");
    }

    // Tenta localizar por CPF/CNPJ ou e-mail
    try {
      if (data.cpfCnpj) {
        const cleanDoc = data.cpfCnpj.replace(/\D/g, "");
        const searchRes = await this.client.get(`/customers?cpfCnpj=${cleanDoc}`);
        if (searchRes.data?.data && searchRes.data.data.length > 0) {
          return { id: searchRes.data.data[0].id };
        }
      }
      if (data.email) {
        const searchEmail = await this.client.get(`/customers?email=${encodeURIComponent(data.email)}`);
        if (searchEmail.data?.data && searchEmail.data.data.length > 0) {
          return { id: searchEmail.data.data[0].id };
        }
      }
    } catch (err: any) {
      console.warn("[Asaas] Busca prévia de cliente falhou, criando novo...", err?.response?.data || err.message);
    }

    // Cria novo cliente
    const payload: any = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      mobilePhone: data.mobilePhone || data.phone
    };
    if (data.cpfCnpj) payload.cpfCnpj = data.cpfCnpj.replace(/\D/g, "");
    if (data.postalCode) payload.postalCode = data.postalCode.replace(/\D/g, "");
    if (data.address) payload.address = data.address;
    if (data.addressNumber) payload.addressNumber = data.addressNumber;

    const createRes = await this.client.post("/customers", payload);
    return { id: createRes.data.id };
  }

  /**
   * Cria uma assinatura recorrente
   */
  async createSubscription(data: AsaasSubscriptionInput) {
    if (!this.client) {
      throw new Error("Asaas API Key não configurada no ambiente (.env).");
    }

    const payload: any = {
      customer: data.customerId,
      billingType: data.billingType,
      value: data.value,
      nextDueDate: data.nextDueDate,
      cycle: data.cycle,
      description: data.description
    };

    if (data.billingType === "CREDIT_CARD" && data.creditCard) {
      payload.creditCard = data.creditCard;
      payload.creditCardHolderInfo = data.creditCardHolderInfo;
    }

    const res = await this.client.post("/subscriptions", payload);
    return res.data;
  }

  /**
   * Busca as cobranças/faturas vinculadas a uma assinatura
   */
  async getSubscriptionPayments(subscriptionId: string) {
    if (!this.client) {
      throw new Error("Asaas API Key não configurada no ambiente (.env).");
    }

    const res = await this.client.get(`/subscriptions/${subscriptionId}/payments`);
    return res.data?.data || [];
  }

  /**
   * Obtém o QR Code e linha digitável PIX de uma cobrança específica
   */
  async getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
    if (!this.client) {
      throw new Error("Asaas API Key não configurada no ambiente (.env).");
    }

    const res = await this.client.get(`/payments/${paymentId}/pixQrCode`);
    return res.data;
  }
}

export const asaasClient = new AsaasClient();
