interface RevisionGraphWebviewFlowAiTextInteractions {
  readonly pullRequestDependencies: Pick<
    RevisionGraphWebviewFlowPullRequestDialogDependencies,
    'copyField' | 'improveText' | 'cancelImprovement' | 'openUrl'
  >;
  readonly releaseDependencies: Pick<
    RevisionGraphWebviewFlowBranchDialogDependencies,
    'improveReleaseText' | 'cancelImprovement'
  >;
}

function createRevisionGraphWebviewFlowAiTextInteractions(
  postMessage: (message: RevisionGraphProtocol.Message) => void
): RevisionGraphWebviewFlowAiTextInteractions {
  let nextRequestId = 1;
  return {
    pullRequestDependencies: {
      copyField(sourceRefName, targetRefName, field, text) {
        postMessage(createRevisionGraphCopyFlowPullRequestContextFieldMessage(
          sourceRefName, targetRefName, field, text
        ));
      },
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
    releaseDependencies: {
      improveReleaseText(sourceRefName, releaseName, text) {
        const requestId = nextRequestId++;
        postMessage(createRevisionGraphImproveFlowReleaseTextMessage(
          requestId, sourceRefName, releaseName, text
        ));
        return requestId;
      },
      cancelImprovement(requestId) {
        postMessage(createRevisionGraphCancelFlowAiTextMessage(requestId, 'release', 'description'));
      }
    }
  };
}
