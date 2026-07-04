import { addUserNote } from "../lib/user-notes.js";
import { isAuthorized } from "../lib/auth.js";

function register(app) {
  app.view("user_notes", async ({ ack, view, body, client }) => {
    const { targetUserId } = JSON.parse(view.private_metadata);

    if (!(await isAuthorized(body.user.id, client))) {
      await ack();
      return;
    }

    const newNoteBody = view.state.values.new_note?.new_note_input?.value?.trim();

    await ack();

    if (newNoteBody) {
      await addUserNote(targetUserId, newNoteBody, body.user.id);
    }
  });
}

export default register;
