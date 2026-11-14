import http from "k6/http";
import { check, sleep } from "k6";

const baseURL = __ENV.STAGING_BASE_URL?.replace(/\/+$/, "");
const productionURL = __ENV.PRODUCTION_BASE_URL?.replace(/\/+$/, "");

if (!baseURL || !productionURL) {
  throw new Error("Define STAGING_BASE_URL e PRODUCTION_BASE_URL.");
}

const getOrigin = (value) => {
  const match = value.match(/^(https:\/\/[^/?#]+)/i);
  return match ? match[1].toLowerCase() : null;
};

const stagingOrigin = getOrigin(baseURL);
const productionOrigin = getOrigin(productionURL);
const productionHosts = new Set(["chikanegarage.blog", "www.chikanegarage.blog"]);
const stagingHost = stagingOrigin?.replace(/^https:\/\//, "").replace(/:443$/, "");

if (!stagingOrigin || !productionOrigin || stagingOrigin === productionOrigin || productionHosts.has(stagingHost)) {
  throw new Error("O k6 só pode atingir um staging HTTPS separado de produção.");
}

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "30s", target: 25 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "30s", target: 250 },
    { duration: "30s", target: 500 },
    { duration: "30s", target: 1000 },
    { duration: "30s", target: 1000 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<2000"],
  },
};

export default function () {
  const response = http.get(`${baseURL}/`, { redirects: 5, tags: { journey: "homepage" } });
  check(response, {
    "homepage responde com sucesso": (res) => res.status >= 200 && res.status < 400,
    "resposta HTML": (res) => res.headers["Content-Type"]?.includes("text/html"),
  });
  sleep(1);
}

export function handleSummary(data) {
  return { "summary.json": JSON.stringify(data, null, 2) };
}
