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
      name: "Kusama",
      prefix: process.env.NETWORK_PREFIX,
      decimals: "12",
      token: "KSM",
    },
    getExtrinsicLinks: getExtrinsicLinks,
    getExtrinsicLinksBlock: getExtrinsicLinksBlock,
    botToken: process.env.BOT_TOKEN,
    botUsername: process.env.BOT_USERNAME
  };
  return settings;
};
