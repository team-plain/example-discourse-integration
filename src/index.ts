import { PlainClient, parsePlainWebhook } from "@team-plain/typescript-sdk";
import pino from "pino";
import fastify from "fastify";
import { extendLoggingContext, type BaseContext, type Context } from "./context";
import { handlePostCreated } from "./handlePostCreated";
import { assert } from "assert-ts";
import { DiscourseWebhookRequest } from "./types";
import { DiscourseClient } from "./discourseClient";

// Env setup
const DISCOURSE_API_KEY = assert(process.env.DISCOURSE_API_KEY, "DISCOURSE_API_KEY is required");
const PLAIN_API_KEY = assert(process.env.PLAIN_API_KEY, "PLAIN_API_KEY is required");

export const server = fastify({
	ignoreTrailingSlash: true,
});

server.setErrorHandler((err, req, res) => {
	if (err.statusCode === 401) {
		res.code(401).send({ was: "unauthorized" });
		return;
	}
	res.send(err);
});

const client = new PlainClient({
	apiKey: PLAIN_API_KEY || "",
});

export const logger = pino({ level: "debug" });

interface IReply {
	200: { message: string };
	"4xx": { message: string };
	"5xx": { message: string };
}

server.after(() => {
	server.get<{
		Reply: IReply;
	}>("/", async (req, res) => {
		res.code(200).send({ message: "ok" });
	});

	server.post<{
		Reply: IReply;
	}>("/", async (req, res) => {
		const baseCtx: BaseContext = {
			log: logger.child({
				reqId: req.id,
				method: req.method,
				url: req.url,
			}),
			plainClient: client,
		};

		baseCtx.log.info("handling webhook request");

		const body = req.body;
		const parseResult = DiscourseWebhookRequest.safeParse(body);

		if (parseResult.error) {
			baseCtx.log.info("bad request");
			return res.code(400).send({ message: "bad request" });
		}

		const discourseHost = Array.isArray(req.headers["x-discourse-instance"])
			? req.headers["x-discourse-instance"][0]
			: req.headers["x-discourse-instance"];

		if (!discourseHost) {
			baseCtx.log.info("x-discourse-instance header was missing from request");
			return res.code(400).send({ message: "bad request" });
		}

		const payload = parseResult.data;

		baseCtx.log.info(`succesfully parsed discourse for event type: ${payload.webhookEvent}`);

		function onError() {
			baseCtx.log.error("internal server error");
			res.code(500).send({ message: "Internal server error" });
		}

		function onSuccess() {
			baseCtx.log.info("succesfully handled webhook request");
			res.code(200).send({ message: "success" });
		}

		const ctx: BaseContext & Context = extendLoggingContext(
			{
				...baseCtx,
				discourseClient: new DiscourseClient({ apiKey: DISCOURSE_API_KEY, host: discourseHost }),
			},
			{
				webhookEvent: payload.webhookEvent,
			},
		);

		switch (payload.webhookEvent) {
			case "post_created": {
				return handlePostCreated(ctx, payload, { onError, onSuccess });
			}
			default:
				return res.code(500).send({
					message: "unhandled webhook event",
				});
		}
	});
});

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
const host = "RENDER" in process.env ? "0.0.0.0" : "localhost";

server.listen({ host, port }, (err, address) => {
	if (err) {
		console.error(`failed to start server: ${err.message}`);
		process.exit(1);
	}
	console.log(`server listening at ${address}`);
});
