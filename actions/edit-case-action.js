import { getCaseAction } from "../lib/case-tracker.js";
import { getActiveCategories } from "../lib/infraction-categories.js";
import { buildEditCaseActionView } from "../lib/modals.js";
import { isAuthorized } from "../lib/auth.js";

function register(app) {
  app.action("edit_case_action", async ({ ack, body, action, client }) => {
    await ack();

    if (!(await isAuthorized(body.user.id, client))) return;

    const parts = action.value.split(":");
    const actionId = parseInt(parts[0], 10);
    const caseNumber = parseInt(parts[1], 10);
    if (isNaN(actionId) || isNaN(caseNumber)) return;

    const [actionRow, categories] = await Promise.all([
      getCaseAction(actionId),
      getActiveCategories(),
    ]);
    if (!actionRow) return;

    const stateValues = body.view?.state?.values ?? {};
    const currentStatus = stateValues.status?.status_select?.selected_option?.value;
    const currentAssigneeIds = stateValues.assignees?.assignees_input?.selected_users;

    await client.views.update({
      view_id: body.view.id,
      view: buildEditCaseActionView({
        action: actionRow,
        categories,
        caseNumber,
        currentStatus,
        currentAssigneeIds,
      }),
    });
  });
}

export default register;
