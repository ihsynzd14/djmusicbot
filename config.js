module.exports = {
    prefix: '!',
    nodes: [{
        host: "lavalink.jirayu.net",
        password: "youshallnotpass",
        port: 13592,
        secure: false,
        name: "Main Node"
    }],
    spotify: {
        clientId: "a568b55af1d940aca52ea8fe02f0d93b",
        clientSecret: "e8199f4024fe49c5b22ea9a3dd0c4789"
    },
    // botToken should be set in your .env file as BOT_TOKEN
    botToken: process.env.BOT_TOKEN,
    embedColor: "#5865F2",
    ui: {
        defaultVolume: 50,
        maxQueueSize: 100,
        maxPlaylistSize: 50,
        defaultFilters: {
            bassboost: false,
            nightcore: false,
            vaporwave: false,
            karaoke: false,
            timescale: false
        },
        pagination: {
            itemsPerPage: 10,
            timeout: 300000 // 5 minutes
        },
        buttons: {
            timeout: 300000 // 5 minutes
        }
    }
};
