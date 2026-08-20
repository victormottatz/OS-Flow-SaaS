import axios from "axios";
import prisma from "./src/database/prisma";
import { getAccessToken } from "./src/services/bling";

async function testBlingSearch() {
  const token = await getAccessToken();
  if (!token) {
    console.log("No token");
    return;
  }
  try {
    const searchResponse = await axios.get(
      "https://api.bling.com.br/Api/v3/contatos",
      {
        params: { cnpj: "00000000000", limite: 1 },
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log("With cnpj param:", searchResponse.data?.data?.length, searchResponse.data?.data?.[0]?.nome);

    const searchResponse2 = await axios.get(
      "https://api.bling.com.br/Api/v3/contatos",
      {
        params: { numeroDocumento: "00000000000", limite: 1 },
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log("With numeroDocumento param:", searchResponse2.data?.data?.length, searchResponse2.data?.data?.[0]?.nome);
  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}

testBlingSearch();
