
import { createGraphQLClient } from '../graphqlClient.js';

/**
 * 列出通知
 */
export async function listNotificationsHandler(params: {
	first?: number;
	offset?: number;
	after?: string;
	unreadOnly?: boolean;
}) {
	const gql = await createGraphQLClient();
	const { first = 20, offset, after, unreadOnly = false } = params;

	try {
		const query = `
      query GetNotifications($pagination: PaginationInput!) {
        currentUser {
          notifications(pagination: $pagination) {
            edges {
              cursor
              node {
                id
                type
                body
                read
                level
                createdAt
                updatedAt
              }
            }
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;

		const data = await gql.request<{ currentUser: { notifications: any } }>(query, {
			pagination: {
				first,
				offset,
				after
			}
		});

		let notifications = (data.currentUser?.notifications?.edges || []).map(
			(edge: any) => edge.node
		);
		if (unreadOnly) {
			notifications = notifications.filter((n: any) => !n.read);
		}

		return notifications;
	} catch (error: any) {
		return { error: error.message };
	}
}

/**
 * 标记所有通知已读
 */
export async function readAllNotificationsHandler() {
	const gql = await createGraphQLClient();

	try {
		const mutation = `
      mutation ReadAllNotifications {
        readAllNotifications
      }
    `;

		const data = await gql.request<{ readAllNotifications: boolean }>(mutation);

		return {
			success: data.readAllNotifications,
			message: 'All notifications marked as read'
		};
	} catch (error: any) {
		return { error: error.message };
	}
}
