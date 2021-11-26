import {
  TipEvents,
  Modules,
} from "../../tools/constants.js";
import { saveNewTip } from "./saveNewTip.js";
import { updateTipByClosingEvent } from "./updateTipByClosingEvent.js";
import { updateTipFinalState } from "./updateTipFinalState.js";

const isTipEvent = (section, method, height) => {
  const isSection =
    section === Modules.Tips;
  return isSection && TipEvents.hasOwnProperty(method);
}

export const handleTipEvent = async (
  event,
  normalizedExtrinsic,
  blockIndexer,
  extrinsic
) => {
  const { section, method, data } = event;
  if (!isTipEvent(section, method, blockIndexer.blockHeight)) {
    return;
  }

  const eventData = data.toJSON();
  const [hash] = eventData;
  if (method === TipEvents.NewTip) {
    await saveNewTip(hash, normalizedExtrinsic, extrinsic);
  } else if (method === TipEvents.TipClosing) {
    // TODO: remove this logic when we can analyse all the tip extrinsic
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
    await updateTipFinalState(
      hash,
      method,
      eventData,
      normalizedExtrinsic,
      extrinsic
    );
  }
};