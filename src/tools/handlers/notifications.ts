import { text } from "../../util/mcp.js";
import { getGraphQLClient } from "./graphqlClient.js";

/**
 * 列出通知的参数类型
 */
export interface ListNotificationsParams {
  first?: number;
  offset?: number;
  after?: string;
  unreadOnly?: boolean;
}

/**
 * 标记所有通知已读的参数类型
 */
export interface ReadAllNotificationsParams {}

/**
 * 列出通知
 */
export async function listNotificationsHandler(
  params: ListNotificationsParams,
) {
  const gql = getGraphQLClient();
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

    const data = await gql.request<{ currentUser: { notifications: any } }>(
      query,
      {
        pagination: {
          first,
          offset,
          after,
        },
      },
    );

    let notifications = (data.currentUser?.notifications?.edges || []).map(
      (edge: any) => edge.node,
    );
    if (unreadOnly) {
      notifications = notifications.filter((n: any) => !n.read);
    }

    return text(notifications);
  } catch (error: any) {
    return text({ error: error.message });
  }
}

/**
 * 标记所有通知已读
 */
export async function readAllNotificationsHandler() {
  const gql = getGraphQLClient();

  try {
    const mutation = `
      mutation ReadAllNotifications {
        readAllNotifications
      }
    `;

    const data = await gql.request<{ readAllNotifications: boolean }>(mutation);

    return text({
      success: data.readAllNotifications,
      message: "All notifications marked as read",
    });
  } catch (error: any) {
    return text({ error: error.message });
  }
}
