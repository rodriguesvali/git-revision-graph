import { FlowBranchInfo, FlowBranchKind } from './flowTypes';

export interface FlowReferenceDecoration {
  readonly refName: string;
  readonly kind: FlowBranchKind;
  readonly badge: string;
  readonly title: string;
  readonly isProductionTrunk: boolean;
  readonly hiddenByDefault: boolean;
}

const BADGES: Readonly<Record<FlowBranchKind, string>> = {
  main: 'main',
  release: 'rel',
  sync: 'sync',
  package: 'pkg',
  feature: 'feat',
  task: 'task',
  bug: 'bug',
  hotfix: 'hotfix',
  unknown: '?'
};

export function createFlowReferenceDecoration(branch: FlowBranchInfo): FlowReferenceDecoration {
  return {
    refName: branch.refName,
    kind: branch.kind,
    badge: BADGES[branch.kind],
    title: createDecorationTitle(branch),
    isProductionTrunk: branch.kind === 'main',
    hiddenByDefault: branch.shouldHideByDefault
  };
}

function createDecorationTitle(branch: FlowBranchInfo): string {
  return branch.kind === 'unknown'
    ? 'Unknown flow branch'
    : `${branch.kind[0].toUpperCase()}${branch.kind.slice(1)} flow branch`;
}
