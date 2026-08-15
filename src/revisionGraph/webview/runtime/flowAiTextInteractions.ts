interface RevisionGraphWebviewFlowAiTextInteractions {
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
