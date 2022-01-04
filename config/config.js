

const PORT = 8080;
const environment = {
    development: {
        serverURL: `http://localhost:${PORT}/`,
        dbString: 'mongodb://accountUser:nfts@localhost:27017/test',
        rpc: 'http://public-node.terra.dev:26657',
        lcd: 'https://blockdaemon-terra-lcd.api.bdnodes.net:1317',
    },
    production: {
        serverURL: `http://localhost:${PORT}/`,
        dbString: 'mongodb://localhost:27017/test',
        rpc: 'http://public-node.terra.dev:26657',
        lcd: 'https://blockdaemon-terra-lcd.api.bdnodes.net:1317',
    }
}


module.exports = {
    PORT,
    environment,
}