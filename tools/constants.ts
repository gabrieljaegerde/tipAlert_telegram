export const ksmFirstTipClosedHeight = 2192357;
export const ksmFirstRejectedEventHeight = 1164233;

export const ksmTreasuryRefactorApplyHeight = 6143966;
export const dotTreasuryRefactorApplyHeight = 3899548;

export const TreasuryAccount = "F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29";
export const DotTreasuryAccount = "13UVJyLnbVp9RBZYFwFGyDvVd1y27Tt8tkntv6Q7JVPhFsTB";

export const ProposalState = Object.freeze({
  Proposed: "Proposed",
  ApproveVoting: "ApproveVoting",
  RejectVoting: "RejectVoting",
  Rejected: "Rejected",
  Approved: "Approved",
  Awarded: "Awarded",
});

export const TipEvents = Object.freeze({
  NewTip: "NewTip",
  TipClosing: "TipClosing",
  TipClosed: "TipClosed",
  TipRetracted: "TipRetracted",
  TipSlashed: "TipSlashed",
});

export const TipMethods = Object.freeze({
  tipNew: "tipNew",
  reportAwesome: "reportAwesome",
  retractTip: "retractTip",
  tip: "tip",
  closeTip: "closeTip",
});

export const ProposalEvents = Object.freeze({
  Proposed: "Proposed",
  Awarded: "Awarded",
  Rejected: "Rejected",
});

export const ProposalMethods = Object.freeze({
  proposeSpend: "proposeSpend",
  rejectProposal: "rejectProposal",
  approveProposal: "approveProposal",
});

export const BountyEvents = Object.freeze({
  BountyProposed: "BountyProposed",
  BountyRejected: "BountyRejected",
  BountyBecameActive: "BountyBecameActive",
  BountyAwarded: "BountyAwarded",
  BountyClaimed: "BountyClaimed",
  BountyCanceled: "BountyCanceled",
  BountyExtended: "BountyExtended",
});

export const BountyMethods = Object.freeze({
  proposeBounty: "proposeBounty",
  approveBounty: "approveBounty",
  proposeCurator: "proposeCurator",
  unassignCurator: "unassignCurator",
  acceptCurator: "acceptCurator",
  awardBounty: "awardBounty",
  claimBounty: "claimBounty",
  closeBounty: "closeBounty",
  extendBountyExpiry: "extendBountyExpiry",
});

export const CouncilEvents = Object.freeze({
  Proposed: "Proposed",
  Voted: "Voted",
  Approved: "Approved",
  Disapproved: "Disapproved",
  Executed: "Executed",
  Closed: "Closed",
});

export const CouncilMethods = Object.freeze({
  propose: "propose",
  vote: "vote",
  close: "close",
});

export const Modules = Object.freeze({
  Treasury: "treasury",
  Council: "council",
  Proxy: "proxy",
  Multisig: "multisig",
  Utility: "utility",
  Tips: "tips",
  Bounties: "bounties",
  Staking: "staking",
  Identity: "identity",
  Democracy: "democracy",
  ElectionsPhragmen: "electionsPhragmen",
  PhragmenElection: "PhragmenElection",
  Session: "session",
  Balances: "balances",
  Sudo: "sudo",
});

export const BalancesEvents = Object.freeze({
  Transfer: "Transfer",
});

export const SessionEvents = Object.freeze({
  NewSession: "NewSession",
});

export const ElectionsPhragmenEvents = Object.freeze({
  CandidateSlashed: "CandidateSlashed",
  SeatHolderSlashed: "SeatHolderSlashed",
  NewTerm: "NewTerm",
});

export const DemocracyEvents = Object.freeze({
  Blacklisted: "Blacklisted",
  PreimageInvalid: "PreimageInvalid",
});

export const DemocracyMethods = Object.freeze({
  cancelProposal: "cancel_proposal",
});

export const ProxyMethods = Object.freeze({
  proxy: "proxy",
});

export const IdentityEvents = Object.freeze({
  IdentityKilled: "IdentityKilled",
});

export const MultisigMethods = Object.freeze({
  asMulti: "asMulti",
});

export const UtilityMethods = Object.freeze({
  batch: "batch",
});

export const TreasuryEvent = Object.freeze({
  Burnt: "Burnt",
  Deposit: "Deposit",
  Rejected: "Rejected",
  BountyRejected: "BountyRejected",
});

export const TreasuryMethods = Object.freeze({
  unassignCurator: "unassign_curator",
});

export const StakingEvents = Object.freeze({
  EraPayout: "EraPayout",
  EraPaid: "EraPaid",
  Slash: "Slash",
  Slashed: "Slashed",
  Reward: "Reward",
});

export const timelineItemTypes = Object.freeze({
  extrinsic: "extrinsic",
  event: "event",
});