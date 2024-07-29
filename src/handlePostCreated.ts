import { type ThreadPartsFragment, ThreadStatus, uiComponent } from "@team-plain/typescript-sdk";
import { type Context, extendLoggingContext } from "./context";
import type { DiscoursePostCreatedWebhookRequest } from "./types";
import { upsertCustomerFromDiscourse } from "./upsertCustomerFromDiscourse";

async function getOrCreateThread(
	ctx: Context,
	props: { topicTitle: string; topicId: number },
): Promise<{ thread: ThreadPartsFragment } | null> {
	ctx.log.info(`getting thread by external id (${props.topicId})`);

	const topicCreatedByRes = await ctx.discourseClient.getTopicCreatedBy(ctx, props.topicId);

	if (!topicCreatedByRes) {
		ctx.log.error(`failed to get topic created by details for topic ${props.topicId}`);
		return null;
	}

	const upsertCustomerFromDiscourseRes = await upsertCustomerFromDiscourse(ctx, {
		discourseName: topicCreatedByRes.name || topicCreatedByRes.username,
		discourseUsername: topicCreatedByRes.username,
	});

	if (!upsertCustomerFromDiscourseRes) {
		ctx.log.error(`failed to upser customer that created discourse topic ${props.topicId}`);
		return null;
	}

	// N.B. This is the customer id of the person that _created_ the topic in Discourse
	const customerId = upsertCustomerFromDiscourseRes.customerId;

	const getThreadRes = await ctx.plainClient.getThreadByExternalId({
		customerId: upsertCustomerFromDiscourseRes.customerId,
		externalId: String(props.topicId),
	});

	if (getThreadRes.error) {
		ctx.log.error(
			`failed to get thread by externalId: ${getThreadRes.error.message} (${getThreadRes.error.requestId})`,
		);
		return null;
	}

	if (getThreadRes.data) {
		ctx.log.info(`succesfuly got thread by external id ${props.topicId}: ${getThreadRes.data.id}`);
		return {
			thread: getThreadRes.data,
		};
	}

	ctx.log.info(`thread not found with external id ${props.topicId}, creating it`);

	const createThreadRes = await ctx.plainClient.createThread({
		customerIdentifier: {
			customerId,
		},
		components: [],
		title: props.topicTitle,
		externalId: String(props.topicId),
	});

	if (createThreadRes.error) {
		ctx.log.error(`failed to create thread: ${createThreadRes.error.message} (${createThreadRes.error.requestId})`);
		return null;
	}

	const thread = createThreadRes.data;

	ctx.log.info(`succesfuly created thread with external id ${props.topicId}: ${createThreadRes.data.id}`);
	return {
		thread: thread,
	};
}

export async function handlePostCreated(
	inCtx: Context,
	payload: DiscoursePostCreatedWebhookRequest,
	callbacks: { onError: () => void; onSuccess: () => void },
) {
	const ctx = extendLoggingContext(inCtx, {
		topicId: payload.post.topic_id,
		postId: payload.post.id,
	});

	ctx.log.info("handling post created discourse webhook");

	const customerIdRes = await upsertCustomerFromDiscourse(ctx, {
		discourseName: payload.post.name || payload.post.username,
		discourseUsername: payload.post.username,
	});

	if (!customerIdRes) {
		ctx.log.error("failed to upsert customer");
		return callbacks.onError();
	}

	ctx.log.info(`getting thread by external id: ${payload.post.topic_id}`);

	const threadRes = await getOrCreateThread(ctx, {
		topicId: payload.post.topic_id,
		topicTitle: payload.post.topic_title,
	});

	if (!threadRes) {
		ctx.log.error("failed to get or create thread");
		return callbacks.onError();
	}

	const thread = threadRes.thread;
	const threadId = thread.id;

	ctx.log.info(`creating thread event with post contents for thread ${threadId}`);

	const createEventRes = await ctx.plainClient.createThreadEvent({
		threadId: threadId,
		components: [
			uiComponent.text({ text: payload.post.raw }),
			uiComponent.spacer({ size: "M" }),
			uiComponent.linkButton({
				label: "View in Discourse",
				url: ctx.discourseClient.getUrlForTopic(payload.post.topic_id),
			}),
		],
		title: payload.post.name ? payload.post.name : `@${payload.post.username}`,
	});

	if (createEventRes.error) {
		ctx.log.error(
			`failed to create thread event for thread ${threadId}: ${createEventRes.error.message} (${createEventRes.error.requestId})`,
		);
		return callbacks.onError();
	}

	ctx.log.info(`thread event succesfully created: ${createEventRes.data.id}`);

	if (thread.status === ThreadStatus.Todo) {
		ctx.log.info("thread already in todo, no status change is needed");
		ctx.log.info("succesfully handled post created discourse webhook");
		return callbacks.onSuccess();
	}

	ctx.log.info(`moving thread ${threadId} to todo`);

	const changeStatusRes = await ctx.plainClient.markThreadAsTodo({
		threadId: thread.id,
	});

	if (changeStatusRes.error) {
		ctx.log.error(
			`failed to move thread ${threadId} to todo: ${changeStatusRes.error.message} (${changeStatusRes.error.requestId})`,
		);
		return callbacks.onError();
	}

	ctx.log.info("thread moved to do");
	ctx.log.info("succesfully handled post created discourse webhook");
	return callbacks.onSuccess();
}
