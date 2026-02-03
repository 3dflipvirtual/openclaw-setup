import "server-only";
import { Whop } from "@whop/sdk";

const webhookSecret = process.env.WHOP_WEBHOOK_SECRET ?? "";

export const whop = new Whop({
  appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
  apiKey: process.env.WHOP_API_KEY,
  webhookKey: webhookSecret ? btoa(webhookSecret) : undefined,
});
