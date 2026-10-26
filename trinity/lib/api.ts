import type { z } from "zod";

// Outils communs aux routes API

// Corps JSON d'une requête, validé par un schéma : null s'il est illisible ou invalide
export async function readJsonBody<Output>(
  request: Request,
  schema: z.ZodType<Output, z.ZodTypeDef, unknown>
): Promise<Output | null> {
  const body: unknown = await request.json().catch(() => null);
  const result = schema.safeParse(body);
  return result.success ? result.data : null;
}

// Champ facultatif d'un corps de requête : une valeur du mauvais type compte comme absente,
// pour que la route renvoie son propre message « champ manquant »
export function optionalField<Schema extends z.ZodTypeAny>(schema: Schema) {
  return schema.optional().catch(undefined);
}

// Forme d'une valeur après un aller-retour JSON : les bigint et les dates deviennent des chaînes
export type Jsonified<T> = T extends bigint | Date
  ? string
  : T extends (infer Item)[]
    ? Jsonified<Item>[]
    : T extends object
      ? { [Key in keyof T]: Jsonified<T[Key]> }
      : T;

// JSON ne sait pas sérialiser les bigint (code-barres) : ils sont convertis en chaînes
export function toJson<T>(value: T): Jsonified<T> {
  const text = JSON.stringify(value, (_key, item: unknown) => (typeof item === "bigint" ? item.toString() : item));
  const parsed: unknown = JSON.parse(text);
  // La structure est celle de value, avec les bigint et les dates en chaînes : c'est ce que décrit Jsonified
  return parsed as Jsonified<T>;
}
