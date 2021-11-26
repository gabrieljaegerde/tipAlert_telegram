import { botParams } from "../../config.js";
import { u8aToHex, hexToString } from "@polkadot/util";
import {
  TipEvents,
  ProxyMethods,
  TipMethods,
  Modules,
  MultisigMethods,
  UtilityMethods,
} from "../../tools/constants.js";
import { GenericCall } from "@polkadot/types";
import { logger } from "../../tools/logger.js";
import { createKeyMulti, encodeAddress } from "@polkadot/util-crypto";
import { getTipCollection } from "../mongo/db.js";
import { handleTipEvent } from "../tip/handleTipEvent.js";

const getExtrinsicSigner = (extrinsic) => {
  let signer = extrinsic._raw.signature.get("signer").toString();
  return signer;
};

const isExtrinsicSuccess = (events) => {
  return events.some((e) => e.event.method === "ExtrinsicSuccess");
};

const normalizeExtrinsic = (extrinsic, events) => {
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

export const handleEvents = async (events, blockIndexer, extrinsics) => {
  if (events.length <= 0) {
    return false;
  }

  const normalizedExtrinsics = extrinsics.map((extrinsic) =>
    normalizeExtrinsic(extrinsic, events)
  );

  for (let count = 0; count < events.length; count++) {
    const { event, phase } = events[count];

    let normalizedExtrinsic;
    if (!phase.isNull) {
      const phaseValue = phase.value.toNumber();
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