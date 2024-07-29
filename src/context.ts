import type { PlainClient } from "@team-plain/typescript-sdk";
import type { Logger } from "pino";
import type { DiscourseClient } from "./discourseClient.ts";

export type LoggingContext = {
	log: Logger;
};

export type BaseContext = LoggingContext & {
	plainClient: PlainClient;
};

export type Context = BaseContext & {
	discourseClient: DiscourseClient;
};

export function extendLoggingContext<T extends LoggingContext>(
	inCtx: T,
	data: Record<string, string | number | boolean>,
): T {
	return {
		...inCtx,
		log: inCtx.log.child(data),
	};
}
