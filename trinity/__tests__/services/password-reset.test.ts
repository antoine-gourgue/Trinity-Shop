/**
 * @jest-environment node
 */
import { createHash } from "crypto";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { requestPasswordResetAction, resetPasswordAction } from "@/lib/server-actions/password-reset-actions";
import { INVALID_RESET_LINK } from "@/schemas/passwordResetSchema";
import { hitRateLimit } from "@/lib/rate-limit";
import { createResetToken, isPasswordResetLinkValid, PASSWORD_RESET_TTL_MS } from "@/services/auth/passwordReset";

jest.mock("@/lib/prisma", () => ({
    user: { findUnique: jest.fn(), updateMany: jest.fn() },
    verificationToken: { findUnique: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
}));

// after() de Next exige une requête en cours : la doublure lance la tâche aussitôt
// et la garde, pour que chaque test attende sa fin avant de vérifier
const mockAfterTasks: Promise<unknown>[] = [];
jest.mock("next/server", () => ({
    after: (task: () => Promise<unknown>) => {
        mockAfterTasks.push(task());
    },
}));

type SentEmail = { from: string; to: string[]; subject: string };
const mockSend = jest.fn<Promise<{ error: null }>, [SentEmail]>();
// En-têtes de la requête et limitation des demandes : autorisées par défaut, un test la déclenche
jest.mock("next/headers", () => ({
    headers: jest.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.7" })),
}));

jest.mock("@/lib/rate-limit", () => ({
    ...jest.requireActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit"),
    hitRateLimit: jest.fn().mockResolvedValue(true),
}));

jest.mock("resend", () => ({
    Resend: jest.fn(() => ({ emails: { send: mockSend } })),
}));

// Gabarit remplacé : on lit le lien qu'il reçoit
type EmailProps = { firstName: string; resetUrl: string };
const mockEmailTemplate = jest.fn<null, [EmailProps]>();
jest.mock("@/components/password-reset-email", () => ({
    __esModule: true,
    default: (props: EmailProps) => mockEmailTemplate(props),
}));

const db = {
    findUser: prisma.user.findUnique as jest.Mock,
    updateUsers: prisma.user.updateMany as jest.Mock,
    findToken: prisma.verificationToken.findUnique as jest.Mock,
    deleteTokens: prisma.verificationToken.deleteMany as jest.Mock,
    createToken: prisma.verificationToken.create as jest.Mock,
    transaction: prisma.$transaction as jest.Mock,
};

const JANE = { email: "jane@example.com", firstName: "Jane" };
const IDENTIFIER = "password-reset:jane@example.com";
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const inOneHour = () => new Date(Date.now() + PASSWORD_RESET_TTL_MS);

async function runAfterTasks() {
    await Promise.all(mockAfterTasks.splice(0));
}

// Lien transmis au gabarit de l'e-mail
function emailedLink() {
    const props = mockEmailTemplate.mock.calls[0]?.[0];
    if (!props) throw new Error("Aucun e-mail préparé");
    return new URL(props.resetUrl);
}

const ENV_KEYS = ["APP_URL", "VERCEL_PROJECT_PRODUCTION_URL", "RESEND_API_KEY"] as const;
const savedEnv = ENV_KEYS.map((key) => [key, process.env[key]] as const);

beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    for (const mock of Object.values(db)) mock.mockReset();
    db.transaction.mockResolvedValue([]);
    mockSend.mockResolvedValue({ error: null });
    jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
    jest.restoreAllMocks();
    mockAfterTasks.length = 0;
});

afterAll(() => {
    for (const [key, value] of savedEnv) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

describe("requestPasswordResetAction", () => {
    it("refuses new requests once the limit is reached, without looking up the account", async () => {
        (hitRateLimit as jest.Mock).mockResolvedValueOnce(false);

        const result = await requestPasswordResetAction({ email: "jane@example.com" });

        expect(result).toEqual({ ok: false, error: "Trop de demandes. Réessayez dans une heure." });
        expect(hitRateLimit).toHaveBeenCalledWith("reset:jane@example.com", expect.objectContaining({ limit: 3 }));
        expect(db.findUser).not.toHaveBeenCalled();
    });

    it("gives the usual answer without creating a link when no account matches", async () => {
        db.findUser.mockResolvedValue(null);
        process.env.RESEND_API_KEY = "re_test";

        const result = await requestPasswordResetAction({ email: "nobody@example.com" });
        await runAfterTasks();

        expect(result).toEqual({ ok: true });
        expect(db.findUser).toHaveBeenCalledWith({
            where: { email: "nobody@example.com" },
            select: { email: true, firstName: true },
        });
        expect(db.deleteTokens).not.toHaveBeenCalled();
        expect(db.createToken).not.toHaveBeenCalled();
        expect(mockSend).not.toHaveBeenCalled();
    });

    it("gives the same answer for an account, replaces its link and e-mails a new one valid one hour", async () => {
        db.findUser.mockResolvedValue(JANE);
        let stored: { identifier: string; token: string; expires: Date } | undefined;
        db.createToken.mockImplementation((args: { data: { identifier: string; token: string; expires: Date } }) => {
            stored = args.data;
        });
        process.env.RESEND_API_KEY = "re_test";
        process.env.APP_URL = "https://shop.example.com/";

        const before = Date.now();
        const result = await requestPasswordResetAction({ email: " jane@example.com " });
        await runAfterTasks();

        expect(result).toEqual({ ok: true });

        const link = emailedLink();
        expect(`${link.origin}${link.pathname}`).toBe("https://shop.example.com/auth/reinitialiser");
        expect(link.searchParams.get("email")).toBe(JANE.email);
        const token = link.searchParams.get("token") ?? "";
        expect(token).toMatch(/^[0-9a-f]{64}$/);

        // Seule l'empreinte SHA-256 est stockée, avec une expiration à 1 heure
        expect(stored?.identifier).toBe(IDENTIFIER);
        expect(stored?.token).toBe(sha256(token));
        expect(stored?.token).not.toBe(token);
        expect(stored?.expires.getTime()).toBeGreaterThanOrEqual(before + PASSWORD_RESET_TTL_MS);
        expect(stored?.expires.getTime()).toBeLessThanOrEqual(Date.now() + PASSWORD_RESET_TTL_MS);

        // Les anciens liens de l'adresse sont supprimés avant la création du nouveau, dans la même transaction
        const previousLinks: unknown = expect.objectContaining({
            OR: expect.arrayContaining([{ identifier: IDENTIFIER }]) as unknown,
        });
        expect(db.deleteTokens).toHaveBeenCalledWith({ where: previousLinks });
        expect(db.deleteTokens.mock.invocationCallOrder[0]).toBeLessThan(db.createToken.mock.invocationCallOrder[0] ?? 0);
        expect(db.transaction).toHaveBeenCalledTimes(1);

        expect(mockEmailTemplate.mock.calls[0]?.[0].firstName).toBe("Jane");
        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend.mock.calls[0]?.[0].to).toEqual([JANE.email]);
    });

    it("rejects an invalid e-mail address", async () => {
        const result = await requestPasswordResetAction({ email: "not-an-email" });

        expect(result).toEqual({ ok: false, error: "Adresse e-mail invalide." });
        expect(db.findUser).not.toHaveBeenCalled();
    });

    it("prints the link in the server console in development when Resend is not configured", async () => {
        jest.replaceProperty(process.env, "NODE_ENV", "development");
        const info = jest.spyOn(console, "info").mockImplementation(() => undefined);
        db.findUser.mockResolvedValue(JANE);

        await requestPasswordResetAction({ email: JANE.email });
        await runAfterTasks();

        const loggedLink: unknown = expect.stringContaining("http://localhost:3000/auth/reinitialiser?token=");
        expect(info).toHaveBeenCalledWith(loggedLink);
        expect(mockSend).not.toHaveBeenCalled();
    });

    it("never prints the link outside development", async () => {
        jest.replaceProperty(process.env, "NODE_ENV", "production");
        const info = jest.spyOn(console, "info").mockImplementation(() => undefined);
        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        db.findUser.mockResolvedValue(JANE);

        const result = await requestPasswordResetAction({ email: JANE.email });
        await runAfterTasks();

        expect(result).toEqual({ ok: true });
        expect(info).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(warn.mock.calls)).not.toContain("token=");
        expect(mockSend).not.toHaveBeenCalled();
    });

    it("answers with a generic error when the database is unreachable", async () => {
        db.findUser.mockRejectedValue(new Error("connection refused"));

        const result = await requestPasswordResetAction({ email: JANE.email });

        expect(result).toEqual({ ok: false, error: "Une erreur est survenue. Réessayez dans un instant." });
    });
});

describe("resetPasswordAction", () => {
    const { token: TOKEN } = createResetToken();
    const input = { email: JANE.email, token: TOKEN, password: "nouveau-mdp", confirmPassword: "nouveau-mdp" };

    it("refuses an unknown or already used link", async () => {
        db.findToken.mockResolvedValue(null);

        const result = await resetPasswordAction(input);

        expect(result).toEqual({ ok: false, error: INVALID_RESET_LINK });
        // Recherche par l'empreinte du jeton, jamais par le jeton en clair
        expect(db.findToken).toHaveBeenCalledWith({
            where: { identifier_token: { identifier: IDENTIFIER, token: sha256(TOKEN) } },
            select: { expires: true },
        });
        expect(db.transaction).not.toHaveBeenCalled();
        expect(db.updateUsers).not.toHaveBeenCalled();
    });

    it("refuses a malformed link without querying the database", async () => {
        const result = await resetPasswordAction({ ...input, token: "abc" });

        expect(result).toEqual({ ok: false, error: INVALID_RESET_LINK });
        expect(db.findToken).not.toHaveBeenCalled();
    });

    it("refuses an expired link and deletes it", async () => {
        db.findToken.mockResolvedValue({ expires: new Date(Date.now() - 1000) });

        const result = await resetPasswordAction(input);

        expect(result).toEqual({ ok: false, error: INVALID_RESET_LINK });
        expect(db.deleteTokens).toHaveBeenCalledWith({ where: { identifier: IDENTIFIER, token: sha256(TOKEN) } });
        expect(db.updateUsers).not.toHaveBeenCalled();
    });

    it("applies the sign-up password rules and checks the confirmation", async () => {
        expect(await resetPasswordAction({ ...input, password: "12345", confirmPassword: "12345" })).toEqual({
            ok: false,
            error: "Le mot de passe doit contenir au moins 6 caractères.",
        });
        expect(await resetPasswordAction({ ...input, confirmPassword: "autre-mdp" })).toEqual({
            ok: false,
            error: "Les deux mots de passe ne correspondent pas.",
        });
        expect(db.findToken).not.toHaveBeenCalled();
    });

    it("saves the new password hashed with bcrypt and consumes the link", async () => {
        db.findToken.mockResolvedValue({ expires: inOneHour() });
        db.transaction.mockImplementation((run: (tx: typeof prisma) => Promise<boolean>) => run(prisma));
        db.deleteTokens.mockResolvedValue({ count: 1 });
        let saved: { where: { email: string }; data: { password: string } } | undefined;
        db.updateUsers.mockImplementation((args: { where: { email: string }; data: { password: string } }) => {
            saved = args;
            return Promise.resolve({ count: 1 });
        });

        const result = await resetPasswordAction(input);

        expect(result).toEqual({ ok: true });
        const stillValid: unknown = expect.any(Date);
        expect(db.deleteTokens).toHaveBeenCalledWith({
            where: { identifier: IDENTIFIER, token: sha256(TOKEN), expires: { gt: stillValid } },
        });
        expect(saved?.where).toEqual({ email: JANE.email });
        const hash = saved?.data.password ?? "";
        expect(hash).not.toBe(input.password);
        expect(await bcrypt.compare(input.password, hash)).toBe(true);
    });

    it("refuses a link consumed by a simultaneous request", async () => {
        db.findToken.mockResolvedValue({ expires: inOneHour() });
        db.transaction.mockImplementation((run: (tx: typeof prisma) => Promise<boolean>) => run(prisma));
        db.deleteTokens.mockResolvedValue({ count: 0 });

        const result = await resetPasswordAction(input);

        expect(result).toEqual({ ok: false, error: INVALID_RESET_LINK });
        expect(db.updateUsers).not.toHaveBeenCalled();
    });
});

describe("isPasswordResetLinkValid", () => {
    const { token } = createResetToken();

    it("accepts a known link that has not expired", async () => {
        db.findToken.mockResolvedValue({ expires: inOneHour() });
        expect(await isPasswordResetLinkValid(JANE.email, token)).toBe(true);
    });

    it("refuses an expired or unknown link", async () => {
        db.findToken.mockResolvedValue({ expires: new Date(Date.now() - 1000) });
        expect(await isPasswordResetLinkValid(JANE.email, token)).toBe(false);

        db.findToken.mockResolvedValue(null);
        expect(await isPasswordResetLinkValid(JANE.email, token)).toBe(false);
    });
});

describe("createResetToken", () => {
    it("draws a random 32-byte token valid one hour and keeps only its SHA-256 hash", () => {
        const now = new Date("2026-10-26T10:00:00Z");
        const first = createResetToken(now);
        const second = createResetToken(now);

        expect(first.token).toMatch(/^[0-9a-f]{64}$/);
        expect(first.tokenHash).toBe(sha256(first.token));
        expect(first.expires.toISOString()).toBe("2026-10-26T11:00:00.000Z");
        expect(second.token).not.toBe(first.token);
    });
});
