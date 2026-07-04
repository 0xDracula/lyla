import { assembleUserInfoView, INFO_PAGE_SIZE } from "../lib/modals.js";
import { isAuthorized } from "../lib/auth.js";

function registerShowMore(app, actionId, limitKey) {
  app.action(actionId, async ({ ack, body, client }) => {
    await ack();
    if (!(await isAuthorized(body.user.id, client))) return;

    const metadata = JSON.parse(body.view.private_metadata);
    const { targetUserId } = metadata;
    const limits = {
      actionsLimit: metadata.actionsLimit,
      notesLimit: metadata.notesLimit,
      auditLimit: metadata.auditLimit,
      [limitKey]: metadata[limitKey] + INFO_PAGE_SIZE,
    };

    const view = await assembleUserInfoView(targetUserId, limits);
    await client.views.update({ view_id: body.view.id, view });
  });
}

function register(app) {
  registerShowMore(app, "show_more_actions", "actionsLimit");
  registerShowMore(app, "show_more_notes", "notesLimit");
  registerShowMore(app, "show_more_audit", "auditLimit");
}

export default register;
