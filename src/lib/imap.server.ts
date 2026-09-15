/** Minimal IMAP-over-TLS client used by the payment verifier. */
import tls from "node:tls";

export type ImapMessage = { seq: number; body: string };

type Conn = {
  write: (line: string) => void;
  readUntil: (tag: string) => Promise<string>;
  close: () => void;
};

function connect(host: string, port: number, timeoutMs: number): Promise<Conn> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    let settled = false;
    const waiters: Array<{ tag: string; resolve: (v: string) => void; reject: (e: Error) => void }> = [];

    const socket = tls.connect({ host, port, servername: host }, () => {
      settled = true;
      resolve({
        write: (line) => socket.write(line + "\r\n"),
        readUntil: (tag) =>
          new Promise<string>((res, rej) => {
            waiters.push({ tag, resolve: res, reject: rej });
            drain();
          }),
        close: () => socket.destroy(),
      });
    });

    socket.setTimeout(timeoutMs);
    socket.setEncoding("utf8");

    function drain() {
      const waiter = waiters[0];
      if (!waiter) return;
      const re = new RegExp(`^${waiter.tag} (OK|NO|BAD)[^\\r\\n]*\\r?\\n`, "m");
      const match = re.exec(buffer);
      if (!match) return;
      const end = match.index + match[0].length;
      const chunk = buffer.slice(0, end);
      buffer = buffer.slice(end);
      waiters.shift();
      if (match[1] === "OK") waiter.resolve(chunk);
      else waiter.reject(new Error(chunk.trim().split("\n").pop() || "IMAP command failed"));
      drain();
    }

    socket.on("data", (d: string | Buffer) => {
      buffer += typeof d === "string" ? d : d.toString("utf8");
      drain();
    });
    const fail = (err: Error) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
      while (waiters.length) waiters.shift()!.reject(err);
      socket.destroy();
    };
    socket.on("error", fail);
    socket.on("timeout", () => fail(new Error("IMAP connection timed out")));
    socket.on("close", () => {
      if (!settled) fail(new Error("IMAP connection closed"));
    });
  });
}

function friendly(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/AUTHENTICATIONFAILED|Invalid credentials|LOGIN failed|\bNO\b/i.test(msg)) {
    return new Error("Gmail rejected the credentials. Check the email and 16-character App Password.");
  }
  if (/timed out|ETIMEDOUT|ECONNREFUSED|closed/i.test(msg)) {
    return new Error("Could not reach Gmail IMAP (imap.gmail.com:993). Try again.");
  }
  return new Error(msg);
}

async function withSession<T>(email: string, appPassword: string, fn: (conn: Conn, next: () => string) => Promise<T>): Promise<T> {
  let conn: Conn | null = null;
  let n = 0;
  const next = () => `a${++n}`;
  try {
    conn = await connect("imap.gmail.com", 993, 15000);
    const loginTag = next();
    const safeEmail = email.replace(/["\\]/g, "");
    const safePassword = appPassword.replace(/\s+/g, "").replace(/["\\]/g, "");
    conn.write(`${loginTag} LOGIN "${safeEmail}" "${safePassword}"`);
    await conn.readUntil(loginTag);
    return await fn(conn, next);
  } catch (err) {
    throw friendly(err);
  } finally {
    conn?.close();
  }
}

export async function testImapLogin(email: string, appPassword: string): Promise<void> {
  await withSession(email, appPassword, async (conn, next) => {
    const tag = next();
    conn.write(`${tag} SELECT INBOX`);
    await conn.readUntil(tag);
  });
}

/** Fetch recent messages, including already-read messages. Matching is done by order ID + amount. */
export async function fetchRecentMessages(email: string, appPassword: string, limit = 25): Promise<ImapMessage[]> {
  return withSession(email, appPassword, async (conn, next) => {
    const selectTag = next();
    conn.write(`${selectTag} SELECT INBOX`);
    await conn.readUntil(selectTag);

    const searchTag = next();
    conn.write(`${searchTag} SEARCH ALL`);
    const searchRes = await conn.readUntil(searchTag);
    const line = /^\* SEARCH([^\r\n]*)/m.exec(searchRes)?.[1] ?? "";
    const seqs = line.trim().split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite).slice(-limit).reverse();

    const out: ImapMessage[] = [];
    for (const seq of seqs) {
      const tag = next();
      conn.write(`${tag} FETCH ${seq} (BODY.PEEK[])`);
      const raw = await conn.readUntil(tag);
      out.push({ seq, body: raw });
    }
    return out;
  });
}

/** Backwards-compatible alias used by older callers. */
export const fetchUnseenMessages = fetchRecentMessages;

export async function markSeen(email: string, appPassword: string, seqs: number[]): Promise<void> {
  if (!seqs.length) return;
  await withSession(email, appPassword, async (conn, next) => {
    const selectTag = next();
    conn.write(`${selectTag} SELECT INBOX`);
    await conn.readUntil(selectTag);
    const tag = next();
    conn.write(`${tag} STORE ${seqs.join(",")} +FLAGS (\\Seen)`);
    await conn.readUntil(tag);
  });
}

export function parsePaymentEmail(body: string): { utr: string | null; amount: number | null; purpose: string | null } {
  const text = body
    .replace(/=\r?\n/g, "")
    .replace(/=3D/gi, "=")
    .replace(/=20/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;?/gi, " ")
    .replace(/\s+/g, " ");

  const utr =
    /(?:UTR|RRN|UPI\s*(?:Ref|transaction)\s*(?:No\.?|ID|Number)?)\s*[:#-]?\s*(\d{12})/i.exec(text)?.[1] ??
    null;
  const amountRaw =
    /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i.exec(text)?.[1] ??
    /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|rupees)/i.exec(text)?.[1] ??
    null;
  const purpose = /(?:Purpose|Payment\s*Purpose|Note)\s*[:#-]\s*([A-Za-z0-9._-]{3,100})/i.exec(text)?.[1] ?? null;
  const amount = amountRaw ? Number(amountRaw.replace(/,/g, "")) : null;
  return { utr, amount: amount !== null && Number.isFinite(amount) ? amount : null, purpose };
}
