import { openUserNotesModal } from "../lib/modals.js";
import { isAuthorized, UNAUTHORIZED_TEXT } from "../lib/auth.js";

function register(app) {
  app.command(/^\/(.*dev-|demo-)?lyla-notes$/, async ({ command, ack, client, respond }) => {
    await ack();
    if (!(await isAuthorized(command.user_id, client))) {
      await respond({ text: UNAUTHORIZED_TEXT, response_type: "ephemeral" });
      return;
    }

    const targetUserId = command.text.trim().replace(/[<@>]/g, "").split("|")[0];
    if (!targetUserId) {
      await respond({ text: "Usage: `/lyla-notes @user`", response_type: "ephemeral" });
      return;
    }

    await openUserNotesModal(client, command.trigger_id, targetUserId);
  });
}

export default register;
