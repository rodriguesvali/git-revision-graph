interface RevisionGraphWebviewFlowAiTextInteractions {
  readonly pullRequestDependencies: Pick<
    RevisionGraphWebviewFlowPullRequestDialogDependencies,
    'improveText' | 'cancelImprovement' | 'openUrl'
  >;
  readonly branchDependencies: Pick<
    RevisionGraphWebviewFlowBranchDialogDependencies,
    'improveBranchText' | 'cancelImprovement'
  >;
}

function createRevisionGraphWebviewFlowAiTextInteractions(
  postMessage: (message: RevisionGraphProtocol.Message) => void
): RevisionGraphWebviewFlowAiTextInteractions {
  let nextRequestId = 1;
  return {
    pullRequestDependencies: {
      improveText(sourceRefName, targetRefName, field, title, description) {
        const requestId = nextRequestId++;
        postMessage(createRevisionGraphImproveFlowPullRequestTextMessage(
          requestId, sourceRefName, targetRefName, field, title, description
        ));
        return requestId;
      },
      cancelImprovement(requestId, field) {
        postMessage(createRevisionGraphCancelFlowAiTextMessage(requestId, 'pull-request', field));
      },
      openUrl(sourceRefName, targetRefName, title, description) {
        postMessage(createRevisionGraphOpenFlowPullRequestUrlMessage(
          sourceRefName, targetRefName, title, description
        ));
      }
    },
    branchDependencies: {
      improveBranchText(sourceRefName, branchKind, branchName, text) {
        const requestId = nextRequestId++;
        postMessage(createRevisionGraphImproveFlowBranchTextMessage(
          requestId, sourceRefName, branchKind, branchName, text
        ));
        return requestId;
      },
      cancelImprovement(requestId, branchKind) {
        postMessage(createRevisionGraphCancelFlowAiTextMessage(requestId, branchKind, 'description'));
      }
    }
  };
}
