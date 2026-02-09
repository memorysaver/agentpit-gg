import { db } from "@agentpit-gg/db";
import { arenaWebhookLog } from "@agentpit-gg/db/schema";

const maxAttempts = 3;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const sendWebhookWithRetries = async (options: {
  agentId: string;
  url: string;
  eventType: string;
  payload: unknown;
}): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(options.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: options.eventType,
        data: options.payload,
      }),
    });

    await db.insert(arenaWebhookLog).values({
      id: crypto.randomUUID(),
      agentId: options.agentId,
      eventType: options.eventType,
      url: options.url,
      statusCode: response.status,
      attempt,
      payloadJson: JSON.stringify(options.payload),
      lastAttemptAt: new Date(),
    });

    if (response.ok) {
      return true;
    }

    if (attempt < maxAttempts) {
      await sleep(250 * 2 ** (attempt - 1));
    }
  }

  return false;
};
