#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function parseDotEnv(content) {
  const result = {};
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }
  return result;
}

function tryLoadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const parsed = parseDotEnv(readFileSync(envPath, "utf8"));
  for (const [k, v] of Object.entries(parsed)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

export function getEnv(name) {
  tryLoadDotEnv();
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量: ${name}（请在 .env 中配置）`);
  }
  return value;
}

export async function fetchAccessToken() {
  const appId = getEnv("WECHAT_APP_ID");
  const appSecret = getEnv("WECHAT_APP_SECRET");

  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`获取 access_token HTTP 失败: ${res.status} ${res.statusText}`);
  }

  if (data.errcode && data.errcode !== 0) {
    throw new Error(`获取 access_token 失败: ${data.errcode} ${data.errmsg || "unknown"}`);
  }

  if (!data.access_token) {
    throw new Error(`获取 access_token 失败: 返回中缺少 access_token，响应: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

function applyQueryParams(url, query = {}) {
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
}

async function requestWeChat({ method, endpointPath, body, query = {} }) {
  const accessToken = await fetchAccessToken();
  const url = new URL(`https://api.weixin.qq.com${endpointPath}`);
  url.searchParams.set("access_token", accessToken);
  applyQueryParams(url, query);

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`微信接口 HTTP 失败: ${res.status} ${res.statusText}`);
  }

  if (data.errcode && data.errcode !== 0) {
    throw new Error(`微信接口返回错误: ${data.errcode} ${data.errmsg || "unknown"}`);
  }

  return data;
}

export async function postWeChatJson(endpointPath, body, query = {}) {
  return requestWeChat({ method: "POST", endpointPath, body, query });
}

export async function getWeChatJson(endpointPath, query = {}) {
  return requestWeChat({ method: "GET", endpointPath, query });
}

export function parseArgValue(name, defaultValue = undefined) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) return defaultValue;
  return arg.slice(prefix.length);
}

export function toInt(value, fieldName) {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new Error(`${fieldName} 必须是整数`);
  }
  return n;
}

export function readJsonInput({ jsonArgName = "json", jsonFileArgName = "json_file" } = {}) {
  const rawJson = parseArgValue(jsonArgName);
  const jsonFile = parseArgValue(jsonFileArgName);

  if (rawJson) {
    try {
      return JSON.parse(rawJson);
    } catch (err) {
      throw new Error(`--${jsonArgName} 不是合法 JSON: ${err.message}`);
    }
  }

  if (jsonFile) {
    const filePath = path.resolve(process.cwd(), jsonFile);
    if (!existsSync(filePath)) {
      throw new Error(`JSON 文件不存在: ${jsonFile}`);
    }
    try {
      return JSON.parse(readFileSync(filePath, "utf8"));
    } catch (err) {
      throw new Error(`JSON 文件解析失败 (${jsonFile}): ${err.message}`);
    }
  }

  throw new Error(`请提供 --${jsonArgName}='{}' 或 --${jsonFileArgName}=payload.json`);
}

export function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}
