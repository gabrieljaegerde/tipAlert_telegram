import { GenericExtrinsic, Vec } from "@polkadot/types";
import { FrameSystemEventRecord } from "@polkadot/types/lookup";
import { u8aToHex } from "@polkadot/util";
import { handleTipEvent } from "./tip/handleTipEvent.js";

const getExtrinsicSigner = (extrinsic: GenericExtrinsic) => {
  let signer = extrinsic["_raw"]["signature"].get("signer").toString();
  return signer;
};

const isExtrinsicSuccess = (events: Vec<FrameSystemEventRecord>) => {
  return events.some((e) => e.event.method === "ExtrinsicSuccess");
};

export const normalizeExtrinsic = (extrinsic: GenericExtrinsic, events: Vec<FrameSystemEventRecord>) => {
  if (!extrinsic) {
    throw new Error("Invalid extrinsic object");
  }

  const hash = extrinsic.hash.toHex();
  const callIndex = u8aToHex(extrinsic.callIndex);
  const { args } = extrinsic.method.toJSON();
  const name = extrinsic.method.method;
  const section = extrinsic.method.section;
  const signer = getExtrinsicSigner(extrinsic);

  const isSuccess = isExtrinsicSuccess(events);

  const version = extrinsic.version;
  const data = u8aToHex(extrinsic.data);

  return {
    hash,
    signer,
    section,
    name,
    callIndex,
    version,
    args,
    data,
    isSuccess,
  };
};

export const handleEvents = async (events: Vec<FrameSystemEventRecord>, blockIndexer, extrinsics: Vec<GenericExtrinsic>) => {
  if (events.length <= 0) {
    return false;
  }

  const normalizedExtrinsics = extrinsics.map((extrinsic: GenericExtrinsic) =>
    normalizeExtrinsic(extrinsic, events)
  );

  for (let count = 0; count < events.length; count++) {
    const { event, phase } = events[count];

    let normalizedExtrinsic;
    if (!phase.isNone) {
      const phaseValue = parseInt(phase.value.toString());
      const extrinsic = extrinsics[phaseValue];
      const normalized = normalizedExtrinsics[phaseValue];
      normalizedExtrinsic = {
        extrinsicIndexer: { ...blockIndexer, index: phaseValue },
        ...normalized,
      };
      await handleTipEvent(event, normalizedExtrinsic, blockIndexer, extrinsic);
    }
  }
};