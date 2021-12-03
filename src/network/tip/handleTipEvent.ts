import { getTipCollection } from "../../mongo/db.js";
import {
  TipEvents,
  Modules,
} from "../../../tools/constants.js";
import { saveNewTip } from "./saveNewTip.js";
import { updateTipByClosingEvent } from "./updateTipByClosingEvent.js";
import { updateTipFinalState } from "./updateTipFinalState.js";
import { GenericExtrinsic } from "@polkadot/types";
import { Event } from "@polkadot/types/interfaces";
import { logger } from "../../../tools/logger.js";

const isTipEvent = (section: string, method: string) => {
  const isSection =
    section === Modules.Tips;
  return isSection && TipEvents.hasOwnProperty(method);
};

export const handleTipEvent = async (
  event: Event,
  normalizedExtrinsic,
  blockIndexer,
  extrinsic: GenericExtrinsic
) => {
  const { section, method, data } = event;
  if (!isTipEvent(section, method)) {
    return;
  }

  const eventData = data.toJSON();
  // console.log("eventData", eventData)
  // const [hash] = eventData;
  // console.log("hash", hash)
  // const hash = [];
  // hash.push(eventData);
  const hash = eventData[0];
  if (method === TipEvents.NewTip) {
    const tipCol = await getTipCollection();
    const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
    if (tip) {
      logger.info(`tip with hash: ${hash} exists already`);
      return;
    }
    await saveNewTip(hash, normalizedExtrinsic, extrinsic);
  } else if (method === TipEvents.TipClosing) {
    const tipCol = await getTipCollection();
    const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
    if (!tip) {
      logger.info(`tip with hash: ${hash} TipClosing but doesnt exist in db yet.`);
      await saveNewTip(hash, normalizedExtrinsic, extrinsic);
    }
    await updateTipByClosingEvent(
      hash,
      TipEvents.TipClosing,
      eventData,
      normalizedExtrinsic
    );

  } else if (
    [
      TipEvents.TipClosed,
      TipEvents.TipRetracted,
      TipEvents.TipSlashed,
    ].includes(method)
  ) {
    const tipCol = await getTipCollection();
    const tip = await tipCol.findOne({ hash, isClosedOrRetracted: false });
    if (!tip){
      logger.info(`tip with hash: ${hash} TipClosed/Retracted/Slashed but doesnt exist in db yet.`);
      await saveNewTip(hash, normalizedExtrinsic, extrinsic);
    }
      
    await updateTipFinalState(
      hash,
      method,
      eventData,
      normalizedExtrinsic,
      extrinsic
    );
  }
};