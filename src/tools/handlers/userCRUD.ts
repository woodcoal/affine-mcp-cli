import { text } from "../../util/mcp.js";
import { getGraphQLClient } from "./graphqlClient.js";

/**
 * 更新用户资料的参数类型
 */
export interface UpdateProfileParams {
  name?: string;
  avatarUrl?: string;
}

/**
 * 更新用户设置的参数类型
 */
export interface UpdateSettingsParams {
  settings: {
    receiveCommentEmail?: boolean;
    receiveInvitationEmail?: boolean;
    receiveMentionEmail?: boolean;
  };
}

/**
 * 更新当前用户资料
 */
export async function updateProfileHandler(params: UpdateProfileParams) {
  const gql = getGraphQLClient();
  const { name, avatarUrl } = params;
  
  try {
    const mutation = `
      mutation UpdateProfile($input: UpdateUserInput!) {
        updateProfile(input: $input) {
          id
          name
          avatarUrl
          email
        }
      }
    `;
    
    const input: any = {};
    if (name !== undefined) input.name = name;
    if (avatarUrl !== undefined) input.avatarUrl = avatarUrl;
    
    const data = await gql.request<{ updateProfile: any }>(mutation, { input });
    return text(data.updateProfile);
  } catch (error: any) {
    return text({ error: error.message });
  }
}

/**
 * 更新用户设置
 */
export async function updateSettingsHandler(params: UpdateSettingsParams) {
  const gql = getGraphQLClient();
  const { settings } = params;
  
  try {
    const mutation = `
      mutation UpdateSettings($input: UpdateUserSettingsInput!) {
        updateSettings(input: $input)
      }
    `;

    const input: { receiveCommentEmail?: boolean; receiveInvitationEmail?: boolean; receiveMentionEmail?: boolean } = {};
    if (typeof settings.receiveCommentEmail === 'boolean') input.receiveCommentEmail = settings.receiveCommentEmail;
    if (typeof settings.receiveInvitationEmail === 'boolean') input.receiveInvitationEmail = settings.receiveInvitationEmail;
    if (typeof settings.receiveMentionEmail === 'boolean') input.receiveMentionEmail = settings.receiveMentionEmail;
    if (Object.keys(input).length === 0) {
      return text({
        error: "settings must include at least one of: receiveCommentEmail, receiveInvitationEmail, receiveMentionEmail",
      });
    }

    const data = await gql.request<{ updateSettings: boolean }>(mutation, { 
      input
    });
    
    return text({ success: data.updateSettings });
  } catch (error: any) {
    return text({ error: error.message });
  }
}
