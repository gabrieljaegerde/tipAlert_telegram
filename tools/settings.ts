function getExtrinsicLinks(network, txHash) {
  const links = [];
  links.push([
    ["subscan", `https://${network.toLowerCase()}.subscan.io/extrinsic/${txHash}`]
  ]);
  return links;
}

function getExtrinsicLinksBlock(network, index, block) {
  const links = [];
  links.push([
    ["subscan", `https://${network.toLowerCase()}.subscan.io/extrinsic/${block}-${index}`]
  ]);
  return links;
}

export const getSettings = () => {
  const settings = {
    network: {
      name: process.env.NETWORK_NAME,
      prefix: process.env.NETWORK_PREFIX,
      decimals: process.env.NETWORK_DECIMALS,
      token: process.env.NETWORK_TOKEN,
    },
    getExtrinsicLinks: getExtrinsicLinks,
    getExtrinsicLinksBlock: getExtrinsicLinksBlock,
    botToken: process.env.BOT_TOKEN,
    botUsername: process.env.BOT_USERNAME
  };
  return settings;
};
