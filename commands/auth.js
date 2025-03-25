const fs = require('fs');
const path = require('path');
const { isAdmin } = require("../middleware");
module.exports = {
    config: {
        name: 'auth',
        description: 'Renew authentication token',
        usage: `!auth <newToken>`,
    },
    async run (bot, message, args) {
        console.log(message.author.username +' is attempting to renew authentication token.');
        if (!isAdmin(message.author.username)) {
            return message.channel.send('You are about to do something dangerious. Contact FUZZY to grant permission.'); 
        }
        
        // Get the new authentication token from the command arguments
        let newAuthToken = args[0];

        // Check if token is provided
        if (!newAuthToken) {
            return message.channel.send('Please provide a new authentication token.');
        }

        // Get the path to your .env file
        const envPath = path.join(__dirname, '../.env');

        // Update the TOKEN_ECLESIAR in the .env file
        fs.readFile(envPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading .env file:', err);
                return message.channel.send('An error occurred while reading the environment variables.');
            }

            const updatedEnv = data.replace(/TOKEN_ECLESIAR=.*/g, `TOKEN_ECLESIAR=${newAuthToken}`);

            fs.writeFile(envPath, updatedEnv, 'utf8', (err) => {
                if (err) {
                    console.error('Error writing to .env file:', err);
                    return message.channel.send('An error occurred while saving the new authentication token.');
                }

                // Update the process.env
                process.env.TOKEN_ECLESIAR = newAuthToken;

                message.channel.send('Authentication token has been successfully updated.');
            });
        });
    }
};
