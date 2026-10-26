import type { NextRequest } from "next/server";

// Les tests d'API remplacent « next/server » par une doublure : on charge le vrai module pour NextRequest
const { NextRequest: RealNextRequest } = jest.requireActual<typeof import("next/server")>("next/server");

type RequestOptions = {
  method?: string;
  // Corps envoyé en JSON, lu par le handler avec request.json()
  body?: unknown;
};

// Construit une vraie NextRequest ; le fichier de test doit tourner dans l'environnement Jest « node »
// (sous jsdom, whatwg-fetch remplace Request et casse le constructeur de NextRequest)
export function buildRequest(path: string, { method = "GET", body }: RequestOptions = {}): NextRequest {
  return new RealNextRequest(new URL(path, "http://localhost"), {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
