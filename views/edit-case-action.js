import {
  updateCaseAction,
  getCaseByNumber,
  getCaseAssignees,
  getCaseActions,
} from "../lib/case-tracker.js";
import { buildCaseInfoView } from "../lib/modals.js";
import { isAuthorized } from "../lib/auth.js";

function register(app) {
  app.view("edit_case_action", async ({ ack, view, body, client }) => {
    const { actionId, caseNumber, currentStatus, currentAssigneeIds } = JSON.parse(
      view.private_metadata
    );

    if (!(await isAuthorized(body.user.id, client))) {
      await ack();
      return;
    }

    const values = view.state.values;
    const parsedCategoryCode = parseInt(
      values.category?.category_select?.selected_option?.value,
      10
    );
    const categoryCode = isNaN(parsedCategoryCode) ? null : parsedCategoryCode;
    const categoryExtra = values.category_extra?.category_extra_input?.value?.trim() || null;
    const whatTheyDid = values.what_they_did?.what_they_did_input?.value?.trim() || null;
    const banUntil = values.ban_until?.ban_date_input?.selected_date || null;

    await ack();

    await updateCaseAction(actionId, body.user.id, {
      categoryCode,
      categoryExtra,
      data: { whatTheyDid, banUntil },
    });

    const [caseData, assignees, actions] = await Promise.all([
      getCaseByNumber(caseNumber),
      getCaseAssignees(caseNumber),
      getCaseActions(caseNumber),
    ]);
    if (!caseData) return;

    await client.views.update({
      view_id: body.view.id,
      view: buildCaseInfoView({
        caseData: { ...caseData, status: currentStatus ?? caseData.status },
        assigneeIds: currentAssigneeIds ?? assignees.map((a) => a.userId),
        actions,
      }),
    });
  });
}

export default register;
