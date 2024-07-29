import type { Context } from "./context";

export async function upsertCustomerFromDiscourse(
	ctx: Context,
	props: { discourseUsername: string; discourseName: string },
): Promise<{ customerId: string } | null> {
	ctx.log.info("upserting customer to Plain");

	const userEmail = await ctx.discourseClient.getUserEmail(ctx, props.discourseUsername);

	if (!userEmail) {
		ctx.log.error("failed to get email for discourse user so can't proceed with upserting customer to Plain");
		return null;
	}

	const nameParts = props.discourseName.split(" ");
	const shortName = nameParts.length > 1 ? nameParts[0] : null;

	const upsertCustomerRes = await ctx.plainClient.upsertCustomer({
		identifier: {
			emailAddress: userEmail,
		},
		onCreate: {
			fullName: props.discourseName,
			shortName: shortName,
			email: {
				email: userEmail,
				isVerified: true,
			},
		},
		onUpdate: {},
	});

	if (upsertCustomerRes.error) {
		ctx.log.error(
			`failed to upsert customer: ${upsertCustomerRes.error.message} (${upsertCustomerRes.error.requestId})`,
		);
		return null;
	}

	const customerId = upsertCustomerRes.data.customer.id;
	ctx.log.info(`successfully upserted customer ${customerId}`);
	return { customerId };
}
