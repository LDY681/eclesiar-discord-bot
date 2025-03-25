module.exports = {
    name: 'guildCreate',
    execute(guild, bot) {
        console.log(`Eclesiar Bot joined a new server: ${guild.name}`);

        // Find the default system channel, or find the first available text channel where the bot can send a message
        let defaultChannel = guild.systemChannel || guild.channels.cache.find(channel => 
            channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
        );

        // Send a welcome message if a suitable channel is found
        if (defaultChannel) {
            defaultChannel.send("Wassup my ppl! Type `!help` to get started. If you have encountered any issues, please hop on FUZZY now! Made with ❤ by FUZZY");
        } else {
            console.log(`Could not find a suitable channel to send a welcome message in ${guild.name}`);
        }
    }
};