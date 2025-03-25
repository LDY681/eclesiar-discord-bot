const fs = require('fs');
const path = require('path');
const { isAdmin } = require("../middleware");
module.exports = {
    config: {
        name: 'cookie',
        description: 'Renew cookie session',
        usage: `!cookie <newCookie>`,
    },
    async run (bot, message, args) {
        console.log(message.author.username +' is attempting to renew cookie session.');
        if (!isAdmin(message.author.username)) {
            return message.channel.send('You are about to do something dangerious. Contact FUZZY to grant permission.'); 
        }

        // Get the new cookie token from the command arguments
        let newCookie = args[0];

        // Check if token is provided
        if (!newCookie) {
            return message.channel.send('Please provide a new cookie token.');
        }

        // Get the path to your .env file
        const envPath = path.join(__dirname, '../.env');

        // Update the SESSION_ECLESIAR in the .env file
        fs.readFile(envPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading .env file:', err);
                return message.channel.send('An error occurred while reading the environment variables.');
            }

            const updatedEnv = data.replace(/SESSION_ECLESIAR=.*/g, `SESSION_ECLESIAR=${newCookie}`);

            fs.writeFile(envPath, updatedEnv, 'utf8', (err) => {
                if (err) {
                    console.error('Error writing to .env file:', err);
                    return message.channel.send('An error occurred while saving the new cookie.');
                }

                // Update the process.env
                process.env.SESSION_ECLESIAR = newCookie;

                message.channel.send('cookie has been successfully updated.');
            });
        });
    }
};
