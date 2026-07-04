import { getUserNote, getUserNotes, deleteUserNote } from "../lib/user-notes.js";
import { buildEditUserNoteView, buildUserNotesView } from "../lib/modals.js";
import { isAuthorized } from "../lib/auth.js";

function register(app) {
  app.action("edit_user_note", async ({ ack, body, action, client }) => {
    await ack();
    if (!(await isAuthorized(body.user.id, client))) return;

    const note = await getUserNote(Number(action.value));
    if (!note) return;

    await client.views.update({
      view_id: body.view.id,
      view: buildEditUserNoteView({ note }),
    });
  });

  app.action("delete_user_note", async ({ ack, body, action, client }) => {
    await ack();
    if (!(await isAuthorized(body.user.id, client))) return;

    const { targetUserId } = JSON.parse(body.view.private_metadata);
    await deleteUserNote(Number(action.value), body.user.id);
    const notes = await getUserNotes(targetUserId);

    await client.views.update({
      view_id: body.view.id,
      view: buildUserNotesView({ targetUserId, notes }),
    });
  });
}

export default register;
