module.exports = {
  config: {
    name: "remind",
    description: "Set a reminder with a countdown",
    usage: `!remind <minutes> <message>`,
  },
  async run(bot, message, args) {
    console.log(`!remind command executed by ${message.author.username}`, args);
    const reminderTime = parseFloat(args[0]);
    const reminderText = args.slice(1).join(" ");

    if (isNaN(reminderTime) || reminderTime <= 0 || !reminderText) {
      message.channel.send("Invalid format. Use `!remind <minutes> <message>`.");
      return;
    }

    message.channel.send(`Set reminder for ${reminderTime} minutes.`);

    setTimeout(() => {
      message.channel.send(`**[Reminder]** <@${message.author.id}>: ${reminderText}`);
    }, reminderTime * 60 * 1000);
  }
};
