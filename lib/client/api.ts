"use client";

import { useCallback, useEffect, useState } from "react";

export const UNAUTHORIZED_EVENT = "nexo:unauthorized";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown };

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const response = await fetch(path, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers: options.body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
    body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiRequestError(response.status, data?.error ?? "No se pudo completar la solicitud.");
  }
  return data as T;
}

type Result<T> = { key: string; data: T | null; error: string | null };

// Carga `path` (null = no cargar). Al recargar conserva los datos previos mientras llega la respuesta.
export function useApi<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = path === null ? null : `${path}#${version}`;

  useEffect(() => {
    if (path === null || key === null) return;
    let active = true;
    api<T>(path).then(
      (data) => {
        if (active) setResult({ key, data, error: null });
      },
      (error: Error) => {
        if (active) setResult((previous) => ({ key, data: previous?.data ?? null, error: error.message }));
      },
    );
    return () => {
      active = false;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return {
    data: result?.data ?? null,
    error: result?.key === key ? result.error : null,
    loading: key !== null && result?.key !== key,
    reload,
  };
}
