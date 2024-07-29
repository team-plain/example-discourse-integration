import { z } from "zod";

export const DiscoursePostCreatedWebhookRequest = z.object({
	webhookEvent: z.literal("post_created").default("post_created"),
	post: z.object({
		id: z.number(),
		user_id: z.number(),
		name: z.string().optional(),
		username: z.string(),
		raw: z.string(),
		topic_id: z.number(),
		topic_title: z.string(),
	}),
});
export type DiscoursePostCreatedWebhookRequest = z.infer<typeof DiscoursePostCreatedWebhookRequest>;

// In case we ever have to handle multiple discourse webhook events we can make this into
// a union and then everything will continue to work fine.
export const DiscourseWebhookRequest = DiscoursePostCreatedWebhookRequest;
export type DiscourseWebhookRequest = z.infer<typeof DiscourseWebhookRequest>;
