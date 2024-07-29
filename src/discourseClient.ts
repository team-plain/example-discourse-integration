import { z } from "zod";
import type { Context } from "./context";

export class DiscourseClient {
	private apiKey: string;
	private host: string;

	constructor(props: { apiKey: string; host: string }) {
		this.apiKey = props.apiKey;
		this.host = props.host;
	}

	async getUserEmail(ctx: Context, username: string): Promise<string | null> {
		const responseSchema = z.object({
			email: z.string(),
		});

		return await fetch(`${this.host}/u/${username}/emails.json`, {
			headers: {
				"Api-Key": this.apiKey,
				"Api-Username": "system",
			},
		})
			.then((res) => res.json())
			.then((body) => {
				const parsedRespose = responseSchema.parse(body);
				return parsedRespose.email;
			})
			.catch((e) => {
				ctx.log.error(`failed to get email for discourse user with username ${username}: ${e.message}`);
				return null;
			});
	}

	async getTopicCreatedBy(ctx: Context, topicId: number): Promise<{ username: string; name?: string } | null> {
		const responseSchema = z.object({
			details: z.object({
				created_by: z.object({
					username: z.string(),
					name: z.string().optional(),
				}),
			}),
		});

		return await fetch(`${this.host}/t/${topicId}.json`, {
			headers: {
				"Api-Key": this.apiKey,
				"Api-Username": "system",
			},
		})
			.then((res) => res.json())
			.then((body) => {
				const parsedRespose = responseSchema.parse(body);
				return parsedRespose.details.created_by;
			})
			.catch((e) => {
				ctx.log.error(`failed to get discourse topic ${topicId}: ${e.message}`);
				return null;
			});
	}

	getUrlForTopic(topicId: number) {
		return `${this.host}/t/${topicId}`;
	}
}
