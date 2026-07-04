import { editUserNote, getUserNotes } from "../lib/user-notes.js";
import { buildUserNotesView } from "../lib/modals.js";
import { isAuthorized } from "../lib/auth.js";

function register(app) {
  app.view("edit_user_note", async ({ ack, view, body, client }) => {
    const { noteId, targetUserId } = JSON.parse(view.private_metadata);

    if (!(await isAuthorized(body.user.id, client))) {
      await ack();
      return;
    }

    const newBody = view.state.values.body?.body_input?.value?.trim();

    await editUserNote(noteId, body.user.id, newBody);
    const notes = await getUserNotes(targetUserId);

    await ack({
      response_action: "update",
      view: buildUserNotesView({ targetUserId, notes }),
    });
  });
}

export default register;
